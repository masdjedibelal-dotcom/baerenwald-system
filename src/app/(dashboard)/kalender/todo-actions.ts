'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { CrmTodo, TodoPrioritaet } from '@/lib/types'

const TODO_SELECT = `
  *,
  kunden(id, name),
  leads(id, kontakt_name),
  auftraege(id, titel),
  handwerker(id, name, firma)
`

export type TodoListFilter = {
  erledigt?: boolean | 'all'
  zugewiesenAn?: string | null
  kundeId?: string | null
  leadId?: string | null
  auftragId?: string | null
  handwerkerId?: string | null
  limit?: number
}

export type TodoSaveInput = {
  id?: string | null
  titel: string
  beschreibung?: string | null
  faellig_am?: string | null
  prioritaet?: TodoPrioritaet
  zugewiesen_an?: string | null
  kunde_id?: string | null
  lead_id?: string | null
  auftrag_id?: string | null
  handwerker_id?: string | null
  erledigt?: boolean
}

function revalidateTodoPaths(row?: {
  kunde_id?: string | null
  lead_id?: string | null
  auftrag_id?: string | null
  handwerker_id?: string | null
}) {
  revalidatePath('/kalender')
  if (row?.kunde_id) revalidatePath(`/kunden/${row.kunde_id}`)
  if (row?.lead_id) revalidatePath(`/anfragen/${row.lead_id}`)
  if (row?.auftrag_id) revalidatePath(`/auftraege/${row.auftrag_id}`)
  if (row?.handwerker_id) revalidatePath(`/handwerker/${row.handwerker_id}`)
}

export async function listTodos(
  filter: TodoListFilter = {}
): Promise<{ ok: true; todos: CrmTodo[] } | { ok: false; message: string }> {
  const supabase = createClient()
  let q = supabase.from('todos').select(TODO_SELECT).order('erledigt', { ascending: true })

  if (filter.erledigt === true) q = q.eq('erledigt', true)
  else if (filter.erledigt !== 'all') q = q.eq('erledigt', false)

  if (filter.zugewiesenAn) q = q.eq('zugewiesen_an', filter.zugewiesenAn)
  if (filter.kundeId) q = q.eq('kunde_id', filter.kundeId)
  if (filter.leadId) q = q.eq('lead_id', filter.leadId)
  if (filter.auftragId) q = q.eq('auftrag_id', filter.auftragId)
  if (filter.handwerkerId) q = q.eq('handwerker_id', filter.handwerkerId)

  q = q
    .order('faellig_am', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 200)

  const { data, error } = await q
  if (error) return { ok: false, message: error.message }
  return { ok: true, todos: (data ?? []) as CrmTodo[] }
}

export async function saveTodo(
  input: TodoSaveInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const titel = input.titel.trim()
  if (!titel) return { ok: false, message: 'Titel fehlt' }

  const prioritaet: TodoPrioritaet =
    input.prioritaet === 'niedrig' || input.prioritaet === 'hoch' ? input.prioritaet : 'normal'

  const payload = {
    titel,
    beschreibung: input.beschreibung?.trim() || null,
    faellig_am: input.faellig_am?.trim() || null,
    prioritaet,
    zugewiesen_an: input.zugewiesen_an?.trim() || null,
    kunde_id: input.kunde_id?.trim() || null,
    lead_id: input.lead_id?.trim() || null,
    auftrag_id: input.auftrag_id?.trim() || null,
    handwerker_id: input.handwerker_id?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const patch: Record<string, unknown> = { ...payload }
    if (typeof input.erledigt === 'boolean') {
      patch.erledigt = input.erledigt
      patch.erledigt_at = input.erledigt ? new Date().toISOString() : null
    }
    const { error } = await supabase.from('todos').update(patch).eq('id', input.id)
    if (error) return { ok: false, message: error.message }
    revalidateTodoPaths(payload)
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabase
    .from('todos')
    .insert({
      ...payload,
      erledigt: input.erledigt ?? false,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidateTodoPaths(payload)
  return { ok: true, id: data.id as string }
}

export async function setTodoErledigt(
  id: string,
  erledigt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('todos')
    .select('kunde_id, lead_id, auftrag_id, handwerker_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('todos')
    .update({
      erledigt,
      erledigt_at: erledigt ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  revalidateTodoPaths(row ?? undefined)
  return { ok: true }
}

export async function deleteTodo(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('todos')
    .select('kunde_id, lead_id, auftrag_id, handwerker_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidateTodoPaths(row ?? undefined)
  return { ok: true }
}

/** Combobox-Optionen für Anfragen + Aufträge (Vorgang-Verknüpfung). */
export async function searchVorgaengeFuerTodo(q?: string): Promise<
  | { ok: true; options: { value: string; label: string; sub?: string }[] }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const term = (q ?? '').trim()
  const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const pattern = term ? `%${esc}%` : null

  let leadsQ = supabase
    .from('leads')
    .select('id, kontakt_name, status')
    .order('created_at', { ascending: false })
    .limit(80)
  let auftraegeQ = supabase
    .from('auftraege')
    .select('id, titel, status')
    .order('created_at', { ascending: false })
    .limit(80)

  if (pattern) {
    leadsQ = leadsQ.ilike('kontakt_name', pattern)
    auftraegeQ = auftraegeQ.ilike('titel', pattern)
  }

  const [leads, auftraege] = await Promise.all([leadsQ, auftraegeQ])
  if (leads.error) return { ok: false, message: leads.error.message }
  if (auftraege.error) return { ok: false, message: auftraege.error.message }

  const options: { value: string; label: string; sub?: string }[] = []
  for (const a of auftraege.data ?? []) {
    options.push({
      value: `a:${a.id}`,
      label: (a.titel as string)?.trim() || 'Auftrag',
      sub: 'Auftrag',
    })
  }
  for (const l of leads.data ?? []) {
    options.push({
      value: `l:${l.id}`,
      label: (l.kontakt_name as string)?.trim() || 'Anfrage',
      sub: 'Anfrage',
    })
  }
  return { ok: true, options }
}

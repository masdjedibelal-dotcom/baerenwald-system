import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { KalenderTermin } from '@/lib/types'

/** CRM-internes To-do — erscheint im Dashboard, nicht in der Anfrage-Terminliste. */
export async function insertInternesTodo(input: {
  titel: string
  datum: string
  lead_id?: string | null
  auftrag_id?: string | null
  beschreibung?: string | null
}): Promise<void> {
  const supabase = supabaseAdmin
  const { error } = await supabase.from('kalender_termine').insert({
    titel: input.titel.trim(),
    datum: input.datum,
    typ: 'intern',
    lead_id: input.lead_id ?? null,
    auftrag_id: input.auftrag_id ?? null,
    uhrzeit_von: null,
    uhrzeit_bis: null,
    adresse: null,
    beschreibung: input.beschreibung?.trim() || null,
    erledigt: false,
  })
  if (error) {
    console.warn('[internes-todo]', error.message)
    return
  }
  revalidatePath('/kalender')
  revalidatePath('/')
  if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
}

export function istLeadTerminAnzeige(termin: KalenderTermin): boolean {
  if (termin.typ === 'intern') return false
  const titel = termin.titel?.trim() ?? ''
  if (titel.startsWith('Nachfassen:')) return false
  return true
}

export async function erledigeInterneNachfassTodos(
  leadId: string | null | undefined,
  angebotKurz?: string | null
): Promise<void> {
  if (!leadId?.trim()) return
  const supabase = supabaseAdmin
  let q = supabase
    .from('kalender_termine')
    .update({ erledigt: true })
    .eq('lead_id', leadId)
    .eq('typ', 'intern')
    .eq('erledigt', false)
    .ilike('titel', 'Nachfassen:%')

  if (angebotKurz?.trim()) {
    q = q.ilike('beschreibung', `%${angebotKurz.trim()}%`)
  }

  const { error } = await q
  if (error) {
    console.warn('[internes-todo erledigen]', error.message)
    return
  }
  revalidatePath('/kalender')
  revalidatePath('/')
  revalidatePath(`/anfragen/${leadId}`)
}

/** Offenes Nachfass-To-do auf neues Datum legen (z. B. nach Gültigkeits-Verlängerung). */
export async function planeInternesNachfassTodo(input: {
  leadId: string | null | undefined
  datum: string
  kundeName: string
  angebotRef: string
}): Promise<void> {
  if (!input.leadId?.trim()) return
  await erledigeInterneNachfassTodos(input.leadId, input.angebotRef)
  await insertInternesTodo({
    titel: `Nachfassen: ${input.kundeName.trim() || 'Kunde'}`,
    datum: input.datum,
    lead_id: input.leadId,
    beschreibung: `Angebot ${input.angebotRef} — Erinnerungs-Mail in 7 Tagen, falls keine Rückmeldung`,
  })
}

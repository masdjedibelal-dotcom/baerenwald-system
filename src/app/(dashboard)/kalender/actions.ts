'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { KalenderTermin } from '@/lib/types'

export async function saveKalenderTermin(input: {
  id?: string | null
  titel: string
  typ: KalenderTermin['typ']
  datum: string
  uhrzeit_von: string | null
  uhrzeit_bis: string | null
  adresse: string | null
  beschreibung: string | null
  lead_id: string | null
  auftrag_id: string | null
  zugewiesen_an?: string | null
  erledigt?: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const payload = {
    titel: input.titel.trim(),
    typ: input.typ,
    datum: input.datum,
    uhrzeit_von: input.uhrzeit_von,
    uhrzeit_bis: input.uhrzeit_bis,
    adresse: input.adresse,
    beschreibung: input.beschreibung,
    lead_id: input.lead_id,
    auftrag_id: input.auftrag_id,
    zugewiesen_an: input.zugewiesen_an?.trim() || null,
    erledigt: input.erledigt ?? false,
  }

  if (input.id) {
    const { error } = await supabase.from('kalender_termine').update(payload).eq('id', input.id)
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kalender')
    if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabase.from('kalender_termine').insert(payload)
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath('/kalender')
  if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
  return { ok: true, id: data.id as string }
}

export async function deleteKalenderTermin(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase.from('kalender_termine').select('lead_id').eq('id', id).maybeSingle()
  const { error } = await supabase.from('kalender_termine').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/kalender')
  const lid = row && typeof (row as { lead_id?: string }).lead_id === 'string' ? (row as { lead_id: string }).lead_id : null
  if (lid) revalidatePath(`/anfragen/${lid}`)
  return { ok: true }
}

export async function setTerminErledigt(
  id: string,
  erledigt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('kalender_termine').update({ erledigt }).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/kalender')
  return { ok: true }
}

export async function moveKalenderTermin(
  id: string,
  datum: string,
  uhrzeit_von: string | null,
  uhrzeit_bis: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kalender_termine')
    .update({
      datum,
      uhrzeit_von,
      uhrzeit_bis,
    })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/kalender')
  return { ok: true }
}

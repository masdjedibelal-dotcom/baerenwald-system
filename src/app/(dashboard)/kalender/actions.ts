'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { KalenderTermin } from '@/lib/types'

export async function saveKalenderTermin(input: {
  id?: string | null
  titel: string
  typ: KalenderTermin['typ'] | string
  datum: string
  uhrzeit_von: string | null
  uhrzeit_bis: string | null
  adresse: string | null
  beschreibung: string | null
  lead_id: string | null
  auftrag_id: string | null
  kunde_id?: string | null
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
    kunde_id: input.kunde_id?.trim() || null,
    zugewiesen_an: input.zugewiesen_an?.trim() || null,
    erledigt: input.erledigt ?? false,
  }

  if (input.id) {
    let { error } = await supabase.from('kalender_termine').update(payload).eq('id', input.id)
    if (error && /kunde_id/i.test(error.message)) {
      const { kunde_id: _k, ...withoutKunde } = payload
      ;({ error } = await supabase.from('kalender_termine').update(withoutKunde).eq('id', input.id))
    }
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kalender')
    if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
    return { ok: true, id: input.id }
  }

  let { data, error } = await supabase.from('kalender_termine').insert(payload)
    .select('id')
    .single()
  if (error && /kunde_id/i.test(error.message)) {
    const { kunde_id: _k, ...withoutKunde } = payload
    ;({ data, error } = await supabase.from('kalender_termine').insert(withoutKunde)
      .select('id')
      .single())
  }

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath('/kalender')
  if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
  return { ok: true, id: data.id as string }
}

/** Adresse zu Kunde / Anfrage / Auftrag für Termin-Übernahme. */
export async function loadTerminLinkAdresse(input: {
  kundeId?: string | null
  leadId?: string | null
  auftragId?: string | null
}): Promise<
  | {
      ok: true
      strasse: string
      hausnummer: string
      plz: string
      ort: string
      label: string
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()

  if (input.kundeId?.trim()) {
    const { data, error } = await supabase
      .from('kunden')
      .select('name, vorname, nachname, strasse, hausnummer, plz, ort, adresse')
      .eq('id', input.kundeId.trim())
      .maybeSingle()
    if (error) return { ok: false, message: error.message }
    if (!data) return { ok: false, message: 'Kunde nicht gefunden' }
    const strasse =
      (data.strasse as string)?.trim() ||
      ((data.adresse as string)?.trim().split(/\s+\d/)[0] ?? '') ||
      ''
    const hausnummer = (data.hausnummer as string)?.trim() || ''
    return {
      ok: true,
      strasse,
      hausnummer,
      plz: (data.plz as string)?.trim() || '',
      ort: (data.ort as string)?.trim() || '',
      label: (data.name as string)?.trim() || 'Kunde',
    }
  }

  if (input.leadId?.trim()) {
    const { data, error } = await supabase
      .from('leads')
      .select(
        'kontakt_name, strasse, hausnummer, plz, ort, kunden:kunde_id(strasse, hausnummer, plz, ort, adresse, name)'
      )
      .eq('id', input.leadId.trim())
      .maybeSingle()
    if (error) return { ok: false, message: error.message }
    if (!data) return { ok: false, message: 'Anfrage nicht gefunden' }
    const k = data.kunden as
      | {
          strasse?: string | null
          hausnummer?: string | null
          plz?: string | null
          ort?: string | null
          adresse?: string | null
          name?: string | null
        }
      | null
      | undefined
    return {
      ok: true,
      strasse: (data.strasse as string)?.trim() || k?.strasse?.trim() || '',
      hausnummer: (data.hausnummer as string)?.trim() || k?.hausnummer?.trim() || '',
      plz: (data.plz as string)?.trim() || k?.plz?.trim() || '',
      ort: (data.ort as string)?.trim() || k?.ort?.trim() || '',
      label: (data.kontakt_name as string)?.trim() || k?.name?.trim() || 'Anfrage',
    }
  }

  if (input.auftragId?.trim()) {
    const { data, error } = await supabase
      .from('auftraege')
      .select(
        'titel, kunden:kunde_id(strasse, hausnummer, plz, ort, adresse, name), leads:lead_id(strasse, hausnummer, plz, ort)'
      )
      .eq('id', input.auftragId.trim())
      .maybeSingle()
    if (error) return { ok: false, message: error.message }
    if (!data) return { ok: false, message: 'Auftrag nicht gefunden' }
    const k = data.kunden as
      | {
          strasse?: string | null
          hausnummer?: string | null
          plz?: string | null
          ort?: string | null
          name?: string | null
        }
      | null
      | undefined
    const lead = data.leads as
      | {
          strasse?: string | null
          hausnummer?: string | null
          plz?: string | null
          ort?: string | null
        }
      | null
      | undefined
    return {
      ok: true,
      strasse: k?.strasse?.trim() || lead?.strasse?.trim() || '',
      hausnummer: k?.hausnummer?.trim() || lead?.hausnummer?.trim() || '',
      plz: k?.plz?.trim() || lead?.plz?.trim() || '',
      ort: k?.ort?.trim() || lead?.ort?.trim() || '',
      label: (data.titel as string)?.trim() || k?.name?.trim() || 'Auftrag',
    }
  }

  return { ok: false, message: 'Keine Verknüpfung' }
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

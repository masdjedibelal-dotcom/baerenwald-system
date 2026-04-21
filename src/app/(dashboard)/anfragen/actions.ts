'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { KalenderTermin, LeadKanal, LeadStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/utils'
import { insertKalenderAutoTermin, tomorrowYmd } from '@/lib/kalender-auto-termine'

export async function updateLeadStatus(
  leadId: string,
  neuerStatus: LeadStatus,
  notiz?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: lead, error: fetchErr } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .single()

  if (fetchErr || !lead) {
    return { ok: false, message: fetchErr?.message ?? 'Lead nicht gefunden' }
  }

  const alterStatus = lead.status as LeadStatus

  const { error: updErr } = await supabase
    .from('leads')
    .update({ status: neuerStatus, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (updErr) {
    return { ok: false, message: updErr.message }
  }

  const { error: histErr } = await supabase.from('leads_status_history').insert({
    lead_id: leadId,
    status_alt: alterStatus,
    status_neu: neuerStatus,
    user_id: user?.id ?? null,
    notiz: notiz ?? null,
  })

  if (histErr) {
    return { ok: false, message: histErr.message }
  }

  const titel = `Status geändert: → ${STATUS_LABELS[neuerStatus]}`
  const { error: tlErr } = await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'status_change',
    titel,
    beschreibung: notiz ?? null,
    erstellt_von: user?.id ?? null,
  })
  if (tlErr) {
    console.warn('lead_timeline:', tlErr.message)
  }

  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { ok: true }
}

export async function updateLeadNotizen(
  leadId: string,
  notizen: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ notizen, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

export async function insertKalenderTermin(input: {
  lead_id: string
  titel: string
  datum: string
  uhrzeit_von: string | null
  uhrzeit_bis: string | null
  typ: KalenderTermin['typ']
  adresse: string | null
  beschreibung: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase.from('kalender_termine').insert({
    lead_id: input.lead_id,
    titel: input.titel,
    datum: input.datum,
    uhrzeit_von: input.uhrzeit_von,
    uhrzeit_bis: input.uhrzeit_bis,
    typ: input.typ,
    adresse: input.adresse,
    beschreibung: input.beschreibung,
    erledigt: false,
    auftrag_id: null,
  })

  if (error) return { ok: false, message: error.message }

  const { error: tlErr } = await supabase.from('lead_timeline').insert({
    lead_id: input.lead_id,
    typ: 'termin',
    titel: `Termin vereinbart: ${input.titel}`,
    beschreibung: input.beschreibung,
    erstellt_von: user?.id ?? null,
  })
  if (tlErr) console.warn('lead_timeline termin:', tlErr.message)

  revalidatePath(`/anfragen/${input.lead_id}`)
  revalidatePath('/kalender')
  return { ok: true }
}

export type NeueAnfragePayload = {
  /** Wenn gesetzt, wird dieser Kunde verknüpft (kein neuer Kunde aus E-Mail-Logik). */
  kunde_id?: string | null
  name: string
  email: string
  telefon: string
  plz: string
  kanal: LeadKanal
  situation: string
  bereiche: string[]
  bereiche_sonstiges?: string | null
  budget_ca?: number | null
  zeitraum_von?: string | null
  zeitraum_bis?: string | null
  notizen: string
}

export async function createAnfrage(
  payload: NeueAnfragePayload
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const name = payload.name.trim()
  const email = payload.email.trim()
  const telefon = payload.telefon.trim()
  const plz = payload.plz.trim()

  if (!name) {
    return { ok: false, message: 'Name ist erforderlich.' }
  }
  if (!email && !telefon) {
    return { ok: false, message: 'Bitte mindestens E-Mail oder Telefon angeben.' }
  }
  const supabase = createClient()

  let kundeId: string | null = payload.kunde_id?.trim() || null

  if (kundeId) {
    const { data: existingKunde, error: kundeLookupErr } = await supabase
      .from('kunden')
      .select('id')
      .eq('id', kundeId)
      .maybeSingle()
    if (kundeLookupErr || !existingKunde?.id) {
      return { ok: false, message: kundeLookupErr?.message ?? 'Kunde nicht gefunden.' }
    }
  }

  if (!kundeId && email) {
    const { data: existing } = await supabase
      .from('kunden')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing?.id) {
      kundeId = existing.id
    }
  }

  if (!kundeId) {
    const kundentyp = payload.situation === 'gewerbe' ? 'gewerbe' : 'privat'
    const { data: kundeRow, error: kundeErr } = await supabase
      .from('kunden')
      .insert({
        name,
        email: email || null,
        telefon: telefon || null,
        plz: plz || null,
        typ: kundentyp,
        adresse: null,
        ort: null,
        notizen: null,
      })
      .select('id')
      .single()

    if (kundeErr || !kundeRow) {
      return { ok: false, message: kundeErr?.message ?? 'Kunde konnte nicht angelegt werden.' }
    }
    kundeId = kundeRow.id
  }

  const { data: leadRow, error: leadErr } = await supabase
    .from('leads')
    .insert({
      kunde_id: kundeId,
      kanal: payload.kanal,
      status: 'neu',
      situation: payload.situation || null,
      bereiche: payload.bereiche.length ? payload.bereiche : null,
      bereiche_sonstiges: payload.bereiche_sonstiges?.trim() || null,
      budget_ca: payload.budget_ca ?? null,
      preis_min: null,
      preis_max: null,
      plz: plz || null,
      zeitraum: null,
      zeitraum_von: payload.zeitraum_von?.trim() || null,
      zeitraum_bis: payload.zeitraum_bis?.trim() || null,
      kundentyp: payload.situation === 'gewerbe' ? 'gewerbe' : 'privat',
      kontakt_name: name,
      kontakt_email: email || null,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: null,
      notizen: payload.notizen.trim() || null,
      funnel_daten: {},
    })
    .select('id')
    .single()

  if (leadErr || !leadRow) {
    return { ok: false, message: leadErr?.message ?? 'Lead konnte nicht gespeichert werden.' }
  }

  const leadId = leadRow.id as string

  const {
    data: { user: actor },
  } = await supabase.auth.getUser()

  await supabase.from('leads_status_history').insert({
    lead_id: leadId,
    status_alt: null,
    status_neu: 'neu',
    user_id: actor?.id ?? null,
  })

  const { error: tlErr } = await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'created',
    titel: 'Anfrage erstellt',
    beschreibung: null,
    erstellt_von: actor?.id ?? null,
  })
  if (tlErr) console.warn('lead_timeline created:', tlErr.message)

  await insertKalenderAutoTermin({
    titel: `Kontakt: ${name}`,
    datum: tomorrowYmd(),
    typ: 'sonstiges',
    lead_id: leadId,
  })

  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true, id: leadId }
}

export async function upsertVorabFormularByLead(input: {
  lead_id: string
  template_id: string
  daten: Record<string, unknown>
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('vorab_formulare')
    .select('id')
    .eq('lead_id', input.lead_id)
    .maybeSingle()

  if (fetchErr) return { ok: false, message: fetchErr.message }

  if (existing) {
    const { error } = await supabase
      .from('vorab_formulare')
      .update({
        template_id: input.template_id,
        daten: input.daten,
      })
      .eq('id', (existing as { id: string }).id)
    if (error) return { ok: false, message: error.message }
  } else {
    const { error } = await supabase.from('vorab_formulare').insert({
      lead_id: input.lead_id,
      template_id: input.template_id,
      daten: input.daten,
    })
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath(`/anfragen/${input.lead_id}`)
  revalidatePath(`/anfragen/${input.lead_id}/vorab`)
  return { ok: true }
}

export async function updateLeadPreisindikation(
  leadId: string,
  preis_min: number | null,
  preis_max: number | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({
      preis_min,
      preis_max,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  revalidatePath('/angebote/neu')
  return { ok: true }
}

export async function updateLeadKontakt(
  leadId: string,
  data: {
    kontakt_name: string
    kontakt_telefon?: string | null
    kontakt_email?: string | null
    plz?: string | null
    kundentyp?: string | null
    kanal?: LeadKanal
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {
    kontakt_name: data.kontakt_name.trim(),
    kontakt_telefon: data.kontakt_telefon?.trim() || null,
    kontakt_email: data.kontakt_email?.trim() || null,
    plz: data.plz?.trim() || null,
    kundentyp: data.kundentyp?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (data.kanal !== undefined) patch.kanal = data.kanal

  const { error } = await supabase.from('leads').update(patch).eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

export async function updateLeadProjekt(
  leadId: string,
  data: {
    situation?: string | null
    bereiche?: string[] | null
    bereiche_sonstiges?: string | null
    budget_ca?: number | null
    zeitraum_von?: string | null
    zeitraum_bis?: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.situation !== undefined) patch.situation = data.situation
  if (data.bereiche !== undefined) patch.bereiche = data.bereiche
  if (data.bereiche_sonstiges !== undefined) patch.bereiche_sonstiges = data.bereiche_sonstiges
  if (data.budget_ca !== undefined) patch.budget_ca = data.budget_ca
  if (data.zeitraum_von !== undefined) patch.zeitraum_von = data.zeitraum_von
  if (data.zeitraum_bis !== undefined) patch.zeitraum_bis = data.zeitraum_bis

  const { error } = await supabase.from('leads').update(patch).eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

export async function updateLeadVorOrtNotizen(
  leadId: string,
  vor_ort_notizen: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ vor_ort_notizen: vor_ort_notizen.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

export async function addLeadNotizRow(
  leadId: string,
  inhalt: string,
  datei_url?: string | null
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const text = inhalt.trim()
  if (!text) return { ok: false, message: 'Inhalt fehlt.' }

  const { data, error } = await supabase
    .from('lead_notizen')
    .insert({
      lead_id: leadId,
      inhalt: text,
      datei_url: datei_url?.trim() || null,
      erstellt_von: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen.' }
  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { ok: true, id: data.id as string }
}

export async function deleteLeadNotizRow(
  notizId: string,
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('lead_notizen').delete().eq('id', notizId).eq('lead_id', leadId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

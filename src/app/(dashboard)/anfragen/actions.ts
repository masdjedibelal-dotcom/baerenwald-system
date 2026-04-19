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
  name: string
  email: string
  telefon: string
  plz: string
  kanal: LeadKanal
  situation: string
  bereiche: string[]
  preis_min: number | null
  preis_max: number | null
  zeitraum: string
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
  if (
    payload.preis_min != null &&
    payload.preis_max != null &&
    payload.preis_min > payload.preis_max
  ) {
    return { ok: false, message: 'Preis Min darf nicht größer als Max sein.' }
  }

  const supabase = createClient()

  let kundeId: string | null = null

  if (email) {
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
      preis_min: payload.preis_min,
      preis_max: payload.preis_max,
      plz: plz || null,
      zeitraum: payload.zeitraum || null,
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

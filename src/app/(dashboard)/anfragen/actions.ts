'use server'

import { revalidatePath } from 'next/cache'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromProjektWasZeilen } from '@/lib/preislisten/sync-neue-leistungen'
import { createClient } from '@/lib/supabase-server'
import type { KalenderTermin, LeadKanal, LeadStatus } from '@/lib/types'
import { STATUS_LABELS, VERLOREN_GRUND_LABELS } from '@/lib/utils'
import { VOR_ORT_TERMIN_TITEL } from '@/lib/kalender-styles'
import {
  bereicheMitLegacyGewerbeSituation,
  leadHatGewerbeKontext,
  situationOhneGewerbe,
} from '@/lib/lead-gewerbe-storage'
import { TERMIN_NOTIZ_MAX_FOTOS, leadNotizFotoUrls } from '@/lib/anfragen/lead-notiz-fotos'
import { syncTerminNotizSpiegel } from '@/lib/anfragen/termin-notiz-spiegel'
import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import type { LeadFunnelPosition } from '@/lib/lead-funnel-positionen'
import { persistWasZeilenInFunnel, type ProjektWasZeile } from '@/lib/lead-projekt-was'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import { istKundeHausverwaltungTyp, istKundeNurGewerbeTyp } from '@/lib/kunde-stammdaten'
import {
  anfrageAdresseAusPayload,
  formatAnfrageAdresseZeile,
  hatAnfrageAdresse,
  kundeAdresseDbFelder,
} from '@/lib/anfrage-adresse'
import { ensureLeadVertriebsAnalyse as ensureLeadVertriebsAnalyseAction } from './lead-vertriebs-analyse-action'

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
    .maybeSingle()

  if (fetchErr) {
    return { ok: false, message: fetchErr.message }
  }
  if (!lead) {
    return { ok: false, message: 'Lead nicht gefunden oder keine Berechtigung.' }
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

/** Nach Kontakt-Aktion (E-Mail, Rückfrage): Status Neu → Kontaktiert. */
export async function markLeadKontaktiertWennNeu(
  leadId: string,
  notiz?: string | null
): Promise<{ ok: true; geaendert: boolean } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: lead, error } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!lead) return { ok: false, message: 'Anfrage nicht gefunden.' }
  if (lead.status !== 'neu') return { ok: true, geaendert: false }

  const res = await updateLeadStatus(leadId, 'kontaktiert', notiz ?? null)
  if (!res.ok) return res
  return { ok: true, geaendert: true }
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

export async function loadCrmTeamFuerTermin(): Promise<
  { id: string; name: string; telefon: string }[]
> {
  const { loadCrmTeamMitglieder } = await import('@/lib/crm-team')
  return loadCrmTeamMitglieder()
}

async function kalenderBeschreibungFuerLead(
  leadId: string,
  input: {
    adresse: string | null
    notiz: string | null
    zugewiesen_an?: string | null
  }
): Promise<string | null> {
  const supabase = createClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('kontakt_name, kontakt_telefon, kontakt_email')
    .eq('id', leadId)
    .maybeSingle()
  const zugewiesenAn = input.zugewiesen_an?.trim() || null
  let mitarbeiterName: string | null = null
  let mitarbeiterTelefon: string | null = null
  if (zugewiesenAn) {
    const { getCrmTeamMitglied } = await import('@/lib/crm-team')
    const ma = await getCrmTeamMitglied(zugewiesenAn)
    mitarbeiterName = ma?.name ?? null
    mitarbeiterTelefon = ma?.telefon ?? null
  }
  const { buildKalenderKundenBeschreibung } = await import('@/lib/kalender-kunden-beschreibung')
  return buildKalenderKundenBeschreibung({
    kontaktName: (lead as { kontakt_name?: string | null } | null)?.kontakt_name,
    kontaktTelefon: (lead as { kontakt_telefon?: string | null } | null)?.kontakt_telefon,
    kontaktEmail: (lead as { kontakt_email?: string | null } | null)?.kontakt_email,
    adresse: input.adresse,
    mitarbeiterName,
    mitarbeiterTelefon,
    notiz: input.notiz,
  })
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
  zugewiesen_an?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const zugewiesenAn = input.zugewiesen_an?.trim() || null
  const beschreibung = input.lead_id
    ? await kalenderBeschreibungFuerLead(input.lead_id, {
        adresse: input.adresse,
        notiz: input.beschreibung,
        zugewiesen_an: zugewiesenAn,
      })
    : input.beschreibung

  const { error } = await supabase.from('kalender_termine').insert({
    lead_id: input.lead_id,
    titel: input.titel,
    datum: input.datum,
    uhrzeit_von: input.uhrzeit_von,
    uhrzeit_bis: input.uhrzeit_bis,
    typ: input.typ,
    adresse: input.adresse,
    beschreibung,
    zugewiesen_an: zugewiesenAn,
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
  /** Anzeigename / Fallback (z. B. „Vorname Nachname“ oder Firma). */
  name: string
  vorname?: string | null
  nachname?: string | null
  email: string
  telefon: string
  plz: string
  kanal: LeadKanal
  situation: string
  bereiche: string[]
  bereiche_sonstiges?: string | null
  budget_ca?: number | null
  /** Website / API: Preisrahmen oder Festpreis (min = max). */
  preis_min?: number | null
  preis_max?: number | null
  funnel_daten?: Record<string, unknown> | null
  zeitraum?: string | null
  zeitraum_von?: string | null
  zeitraum_bis?: string | null
  kundentyp?: string | null
  kontakt_nachricht?: string | null
  notizen: string
  strasse?: string | null
  hausnummer?: string | null
  ort?: string | null
  /** Bauprojekt — Bautagesbericht & Leistungs-Compliance */
  ist_bauprojekt?: boolean
  /** Manuell im CRM: Bestätigungsmail an Kund:in (Standard: aus) */
  bestaetigungsmail_senden?: boolean
}

export async function createAnfrage(
  payload: NeueAnfragePayload
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const name = payload.name.trim()
  const email = payload.email.trim()
  const telefon = payload.telefon.trim()
  const plz = payload.plz.trim()
  const vornameRaw = payload.vorname?.trim() ?? ''
  const nachnameRaw = payload.nachname?.trim() ?? ''
  const ktRaw = payload.kundentyp?.trim().toLowerCase() ?? ''
  const istHausverwaltung = istKundeHausverwaltungTyp(ktRaw)
  const bereicheMergedEarly = bereicheMitLegacyGewerbeSituation(payload.bereiche, payload.situation)
  const istGewerbeKontextEarly = leadHatGewerbeKontext(bereicheMergedEarly, payload.situation)

  if (istHausverwaltung || istGewerbeKontextEarly || ktRaw === 'gewerbe') {
    if (!name.trim()) {
      return {
        ok: false,
        message: istHausverwaltung ? 'Bitte Firma angeben.' : 'Bitte Firmenname angeben.',
      }
    }
  } else if (!name && !vornameRaw && !nachnameRaw) {
    return { ok: false, message: 'Bitte Name oder Vor-/Nachname angeben.' }
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

  const bereicheMerged = bereicheMergedEarly
  const bereicheFinal = bereicheMerged.length ? bereicheMerged : null
  const situationFinal = situationOhneGewerbe(payload.situation)
  const istGewerbe = leadHatGewerbeKontext(bereicheMerged, payload.situation)
  const kundentyp =
    payload.kundentyp?.trim() ||
    (istHausverwaltung ? 'hausverwaltung' : istGewerbe ? 'gewerbe' : 'privat')
  const namen = normalizeKundeNamen({
    typ: kundentyp,
    name: istKundeHausverwaltungTyp(kundentyp) || istKundeNurGewerbeTyp(kundentyp) ? name : undefined,
    vorname: payload.vorname,
    nachname: payload.nachname,
    funnelDaten: payload.funnel_daten,
    kontaktName: name,
  })

  const adresseFelder = anfrageAdresseAusPayload({
    plz,
    strasse: payload.strasse,
    hausnummer: payload.hausnummer,
    ort: payload.ort,
    funnel_daten: payload.funnel_daten,
  })
  const adresseDb = kundeAdresseDbFelder(adresseFelder)
  const plzFinal = plz || adresseDb.plz || null

  if (!kundeId) {
    const { data: kundeRow, error: kundeErr } = await supabase
      .from('kunden')
      .insert({
        name: namen.name,
        vorname: namen.vorname,
        nachname: namen.nachname,
        email: email || null,
        telefon: telefon || null,
        plz: plzFinal,
        typ: kundentyp,
        strasse: adresseDb.strasse,
        hausnummer: adresseDb.hausnummer,
        ort: adresseDb.ort,
        adresse: adresseDb.adresse,
        notizen: null,
      })
      .select('id')
      .single()

    if (kundeErr || !kundeRow) {
      return { ok: false, message: kundeErr?.message ?? 'Kunde konnte nicht angelegt werden.' }
    }
    kundeId = kundeRow.id
  } else if (hatAnfrageAdresse(adresseFelder)) {
    const { error: kUpdErr } = await supabase
      .from('kunden')
      .update({
        ...adresseDb,
        plz: plzFinal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', kundeId)
    if (kUpdErr) return { ok: false, message: kUpdErr.message }
  }

  const { data: leadRow, error: leadErr } = await supabase
    .from('leads')
    .insert({
      kunde_id: kundeId,
      kanal: payload.kanal,
      status: 'neu',
      situation: situationFinal,
      bereiche: bereicheFinal,
      bereiche_sonstiges: payload.bereiche_sonstiges?.trim() || null,
      budget_ca: payload.budget_ca ?? null,
      preis_min: payload.preis_min ?? null,
      preis_max: payload.preis_max ?? null,
      plz: plzFinal,
      zeitraum: payload.zeitraum?.trim() || null,
      zeitraum_von: payload.zeitraum_von?.trim() || null,
      zeitraum_bis: payload.zeitraum_bis?.trim() || null,
      kundentyp:
        payload.kundentyp?.trim() || (istGewerbe ? 'gewerbe' : null),
      kontakt_name: namen.name,
      kontakt_email: email || null,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: payload.kontakt_nachricht?.trim() || null,
      notizen: payload.notizen.trim() || null,
      funnel_daten: payload.funnel_daten && typeof payload.funnel_daten === 'object' ? payload.funnel_daten : {},
      ist_bauprojekt: payload.ist_bauprojekt === true,
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

  if (email && payload.bestaetigungsmail_senden === true) {
    const { sendAnfrageBestaetigung } = await import('@/app/actions/mails')
    const mailRes = await sendAnfrageBestaetigung(leadId, true)
    if (!mailRes.ok) {
      console.warn('sendAnfrageBestaetigung (manuell):', mailRes.message)
    }
  }

  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true, id: leadId }
}

/** Aktualisiert eine bestehende Anfrage wie im „Neue Anfrage“-Wizard (Felder + Funnel zusammen). */
export async function updateAnfrageAusNeuForm(
  leadId: string,
  payload: NeueAnfragePayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const name = payload.name.trim()
  const email = payload.email.trim()
  const telefon = payload.telefon.trim()
  const plz = payload.plz.trim()
  const vornameRaw = payload.vorname?.trim() ?? ''
  const nachnameRaw = payload.nachname?.trim() ?? ''
  const ktRaw = payload.kundentyp?.trim().toLowerCase() ?? ''
  const istHausverwaltung = istKundeHausverwaltungTyp(ktRaw)
  const bereicheMergedEarly = bereicheMitLegacyGewerbeSituation(payload.bereiche, payload.situation)
  const istGewerbeKontextEarly = leadHatGewerbeKontext(bereicheMergedEarly, payload.situation)

  if (istHausverwaltung || istGewerbeKontextEarly || ktRaw === 'gewerbe') {
    if (!name.trim()) {
      return {
        ok: false,
        message: istHausverwaltung ? 'Bitte Firma angeben.' : 'Bitte Firmenname angeben.',
      }
    }
  } else if (!name && !vornameRaw && !nachnameRaw) {
    return { ok: false, message: 'Bitte Name oder Vor-/Nachname angeben.' }
  }
  if (!email && !telefon) {
    return { ok: false, message: 'Bitte mindestens E-Mail oder Telefon angeben.' }
  }

  const supabase = createClient()

  const { data: row, error: fetchErr } = await supabase
    .from('leads')
    .select('id, kunde_id, funnel_daten')
    .eq('id', leadId)
    .maybeSingle()

  if (fetchErr || !row) {
    return { ok: false, message: fetchErr?.message ?? 'Anfrage nicht gefunden.' }
  }

  const existingFunnel =
    row.funnel_daten && typeof row.funnel_daten === 'object' && !Array.isArray(row.funnel_daten)
      ? (row.funnel_daten as Record<string, unknown>)
      : {}
  const incomingFunnel =
    payload.funnel_daten && typeof payload.funnel_daten === 'object' && !Array.isArray(payload.funnel_daten)
      ? { ...(payload.funnel_daten as Record<string, unknown>) }
      : {}

  const mergedFunnel: Record<string, unknown> = { ...existingFunnel, ...incomingFunnel }
  const existingQuelle = typeof existingFunnel.quelle === 'string' ? existingFunnel.quelle.trim() : ''
  mergedFunnel.quelle =
    existingQuelle !== '' ? existingQuelle : (typeof incomingFunnel.quelle === 'string' ? incomingFunnel.quelle : 'crm_manuell')

  const bereicheMerged = bereicheMergedEarly
  const bereicheFinal = bereicheMerged.length ? bereicheMerged : null
  const situationFinal = situationOhneGewerbe(payload.situation)
  const istGewerbe = istGewerbeKontextEarly

  const kundentyp =
    payload.kundentyp?.trim() ||
    (istHausverwaltung ? 'hausverwaltung' : istGewerbe ? 'gewerbe' : 'privat')
  const namen = normalizeKundeNamen({
    typ: kundentyp,
    name: istKundeHausverwaltungTyp(kundentyp) || istKundeNurGewerbeTyp(kundentyp) ? name : undefined,
    vorname: payload.vorname,
    nachname: payload.nachname,
    funnelDaten: mergedFunnel,
    kontaktName: name,
  })

  const adresseFelder = anfrageAdresseAusPayload({
    plz,
    strasse: payload.strasse,
    hausnummer: payload.hausnummer,
    ort: payload.ort,
    funnel_daten: mergedFunnel,
  })
  const adresseDb = kundeAdresseDbFelder(adresseFelder)
  const plzFinal = plz || adresseDb.plz || null

  const kundeId = row.kunde_id as string | null
  if (kundeId) {
    const kundePatch: Record<string, unknown> = {
      name: namen.name,
      vorname: namen.vorname,
      nachname: namen.nachname,
      email: email || null,
      telefon: telefon || null,
      plz: plzFinal,
      typ: kundentyp,
      updated_at: new Date().toISOString(),
    }
    if (hatAnfrageAdresse(adresseFelder)) {
      Object.assign(kundePatch, adresseDb)
    }
    const { error: kErr } = await supabase.from('kunden').update(kundePatch).eq('id', kundeId)
    if (kErr) return { ok: false, message: kErr.message }
  }

  const patch: Record<string, unknown> = {
    kanal: payload.kanal,
    situation: situationFinal,
    bereiche: bereicheFinal,
    bereiche_sonstiges: payload.bereiche_sonstiges?.trim() || null,
    preis_min: payload.preis_min ?? null,
    preis_max: payload.preis_max ?? null,
    plz: plzFinal,
    zeitraum: payload.zeitraum?.trim() || null,
    kundentyp: payload.kundentyp?.trim() || kundentyp,
    kontakt_name: namen.name,
    kontakt_email: email || null,
    kontakt_telefon: telefon || null,
    kontakt_nachricht: payload.kontakt_nachricht?.trim() || null,
    notizen: payload.notizen.trim() || null,
    funnel_daten: mergedFunnel,
    updated_at: new Date().toISOString(),
  }

  if (payload.ist_bauprojekt !== undefined) patch.ist_bauprojekt = payload.ist_bauprojekt === true

  if (payload.budget_ca !== undefined) patch.budget_ca = payload.budget_ca
  if (payload.zeitraum_von !== undefined) patch.zeitraum_von = payload.zeitraum_von?.trim() || null
  if (payload.zeitraum_bis !== undefined) patch.zeitraum_bis = payload.zeitraum_bis?.trim() || null

  const { error: updErr } = await supabase.from('leads').update(patch).eq('id', leadId)
  if (updErr) return { ok: false, message: updErr.message }

  const {
    data: { user: actor },
  } = await supabase.auth.getUser()
  const { error: tlErr } = await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'update',
    titel: 'Anfrage bearbeitet',
    beschreibung: null,
    erstellt_von: actor?.id ?? null,
  })
  if (tlErr && process.env.NODE_ENV === 'development') {
    console.warn('lead_timeline update:', tlErr.message)
  }

  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
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

export async function saveLeadFunnelPositionen(
  leadId: string,
  positionen: LeadFunnelPosition[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row, error: loadErr } = await supabase
    .from('leads')
    .select('funnel_daten')
    .eq('id', leadId)
    .maybeSingle()

  if (loadErr || !row) return { ok: false, message: 'Anfrage nicht gefunden.' }

  const funnel = parseLeadFunnelDaten(row.funnel_daten)
  const { error } = await supabase
    .from('leads')
    .update({
      funnel_daten: { ...funnel, positionen },
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { ok: false, message: error.message }
  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

export async function saveLeadProjektWasZeilen(
  leadId: string,
  zeilen: ProjektWasZeile[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row, error: loadErr } = await supabase
    .from('leads')
    .select('funnel_daten')
    .eq('id', leadId)
    .maybeSingle()

  if (loadErr || !row) return { ok: false, message: 'Anfrage nicht gefunden.' }

  await syncNeueLeistungenToPreisliste(syncInputsFromProjektWasZeilen(zeilen))

  const funnel = parseLeadFunnelDaten(row.funnel_daten)
  const { error } = await supabase
    .from('leads')
    .update({
      funnel_daten: persistWasZeilenInFunnel(funnel, zeilen),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

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

  if (data.situation !== undefined || data.bereiche !== undefined) {
    const incomingSit = data.situation
    if (incomingSit === 'gewerbe') {
      patch.situation = null
      if (data.bereiche !== undefined) {
        const ber = bereicheMitLegacyGewerbeSituation([...(data.bereiche ?? [])], 'gewerbe')
        patch.bereiche = ber.length ? ber : null
      } else {
        const { data: row, error: fetchErr } = await supabase
          .from('leads')
          .select('bereiche')
          .eq('id', leadId)
          .maybeSingle()
        if (fetchErr) return { ok: false, message: fetchErr.message }
        const ber = bereicheMitLegacyGewerbeSituation([...((row?.bereiche as string[] | null) ?? [])], 'gewerbe')
        patch.bereiche = ber.length ? ber : null
      }
    } else {
      if (incomingSit !== undefined) patch.situation = incomingSit
      if (data.bereiche !== undefined) patch.bereiche = data.bereiche?.length ? data.bereiche : null
    }
  }
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
  datei_url?: string | null,
  opts?: {
    kalender_termin_id?: string | null
    titel?: string | null
    datei_urls?: string[] | null
  }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const text = inhalt.trim()
  const terminId = opts?.kalender_termin_id?.trim() || null
  const titel = opts?.titel?.trim() || null
  const urls = (opts?.datei_urls ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
  const legacyUrl = datei_url?.trim() || urls[0] || null
  const allUrls = urls.length ? urls : legacyUrl ? [legacyUrl] : []

  if (terminId && allUrls.length > TERMIN_NOTIZ_MAX_FOTOS) {
    return { ok: false, message: `Maximal ${TERMIN_NOTIZ_MAX_FOTOS} Fotos pro Termin-Notiz.` }
  }
  if (!text && allUrls.length === 0) return { ok: false, message: 'Text oder Foto erforderlich.' }

  if (terminId) {
    const { data: termin } = await supabase
      .from('kalender_termine')
      .select('id')
      .eq('id', terminId)
      .eq('lead_id', leadId)
      .maybeSingle()
    if (!termin) return { ok: false, message: 'Termin nicht gefunden.' }
  }

  const { data, error } = await supabase
    .from('lead_notizen')
    .insert({
      lead_id: leadId,
      inhalt: text,
      datei_url: legacyUrl,
      datei_urls: allUrls.length ? allUrls : null,
      titel,
      kalender_termin_id: terminId,
      erstellt_von: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen.' }

  if (terminId) {
    const sync = await syncTerminNotizSpiegel(supabase, {
      leadId,
      terminNotizId: data.id as string,
      terminId,
      titel,
      inhalt: text,
      datei_url: legacyUrl,
      datei_urls: allUrls.length ? allUrls : null,
      erstellt_von: user?.id ?? null,
    })
    if (!sync.ok) {
      await supabase.from('lead_notizen').delete().eq('id', data.id)
      return { ok: false, message: sync.message }
    }
  }

  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { ok: true, id: data.id as string }
}

export async function updateLeadNotizRow(
  notizId: string,
  leadId: string,
  input: { titel: string; inhalt: string; datei_urls?: string[] | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const titel = input.titel.trim()
  const text = input.inhalt.trim()
  const urls =
    input.datei_urls === undefined
      ? undefined
      : (input.datei_urls ?? []).map((u) => u.trim()).filter(Boolean)
  if (!titel) return { ok: false, message: 'Titel fehlt.' }
  if (!text && (!urls || urls.length === 0)) {
    return { ok: false, message: 'Beschreibung oder Foto erforderlich.' }
  }
  if (urls && urls.length > TERMIN_NOTIZ_MAX_FOTOS) {
    return { ok: false, message: `Maximal ${TERMIN_NOTIZ_MAX_FOTOS} Fotos pro Termin-Notiz.` }
  }

  const patch: Record<string, unknown> = { titel, inhalt: text }
  if (urls !== undefined) {
    patch.datei_urls = urls.length ? urls : null
    patch.datei_url = urls[0] ?? null
  }

  const supabase = createClient()
  const { data: row } = await supabase
    .from('lead_notizen')
    .select('kalender_termin_id, datei_url, datei_urls')
    .eq('id', notizId)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (!row) return { ok: false, message: 'Notiz nicht gefunden.' }

  const { error } = await supabase
    .from('lead_notizen')
    .update(patch)
    .eq('id', notizId)
    .eq('lead_id', leadId)
  if (error) return { ok: false, message: error.message }

  const terminId = (row as { kalender_termin_id?: string | null }).kalender_termin_id?.trim()
  if (terminId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const fotoUrls =
      urls !== undefined ? urls : leadNotizFotoUrls(row as { datei_url: string | null; datei_urls?: string[] | null })
    const sync = await syncTerminNotizSpiegel(supabase, {
      leadId,
      terminNotizId: notizId,
      terminId,
      titel,
      inhalt: text,
      datei_url: fotoUrls[0] ?? null,
      datei_urls: fotoUrls.length ? fotoUrls : null,
      erstellt_von: user?.id ?? null,
    })
    if (!sync.ok) return { ok: false, message: sync.message }
  }

  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { ok: true }
}

export async function deleteLeadNotizRow(
  notizId: string,
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('lead_notizen')
    .select('id, quelle_notiz_id, kalender_termin_id')
    .eq('id', notizId)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (!row) return { ok: false, message: 'Notiz nicht gefunden.' }

  const quelleId = (row as { quelle_notiz_id?: string | null }).quelle_notiz_id?.trim()
  const deleteId = quelleId || notizId

  const { error } = await supabase.from('lead_notizen').delete().eq('id', deleteId).eq('lead_id', leadId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

/** Anfrage (Lead) dauerhaft löschen — abhängige Zeilen entfallen per ON DELETE CASCADE. */
export async function deleteAnfrage(
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/anfragen')
  return { ok: true }
}

async function insertLeadTimelineEntry(
  leadId: string,
  typ: string,
  titel: string,
  beschreibung: string | null
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    typ,
    titel,
    beschreibung,
    erstellt_von: user?.id ?? null,
  })
  if (error) console.warn('lead_timeline:', error.message)
}

export async function saveLeadTerminVereinbart(input: {
  leadId: string
  kontaktName: string
  kontaktEmail?: string | null
  datum: string
  uhrzeit: string
  uhrzeitBis?: string | null
  adresse?: string | null
  notiz: string | null
  zugewiesenAn: string
  mailSenden?: boolean
  mailTo?: string[]
  mailCc?: string[]
  mailBetreff?: string
  mailHtml?: string
  mailBodyText?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const zugewiesenAn = input.zugewiesenAn.trim()
  if (!zugewiesenAn) {
    return { ok: false, message: 'Bitte Mitarbeiter für den Vor-Ort-Termin wählen.' }
  }

  let adresse = (input.adresse ?? '').trim()
  if (!adresse) {
    const supabase = createClient()
    const { data: lead } = await supabase
      .from('leads')
      .select('plz, funnel_daten, kunden!kunde_id(adresse, plz, ort)')
      .eq('id', input.leadId)
      .maybeSingle()
    if (lead) {
      const row = lead as {
        plz?: string | null
        funnel_daten?: unknown
        kunden?: { adresse?: string | null; plz?: string | null; ort?: string | null } | null
      }
      const fd =
        row.funnel_daten && typeof row.funnel_daten === 'object' && !Array.isArray(row.funnel_daten)
          ? (row.funnel_daten as Record<string, unknown>)
          : null
      const addrFelder = anfrageAdresseAusPayload({
        plz: row.plz ?? undefined,
        funnel_daten: fd,
      })
      adresse = formatAnfrageAdresseZeile(addrFelder, row.kunden)
    }
  }

  const supabase = createClient()
  const beschreibung = await kalenderBeschreibungFuerLead(input.leadId, {
    adresse: adresse || null,
    notiz: input.notiz,
    zugewiesen_an: zugewiesenAn,
  })

  const { data: existingBesichtigung } = await supabase
    .from('kalender_termine')
    .select('id')
    .eq('lead_id', input.leadId)
    .eq('typ', 'besichtigung')
    .eq('erledigt', false)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingBesichtigung?.id) {
    const { error } = await supabase
      .from('kalender_termine')
      .update({
        titel: VOR_ORT_TERMIN_TITEL,
        datum: input.datum,
        uhrzeit_von: input.uhrzeit,
        uhrzeit_bis: input.uhrzeitBis?.trim() || null,
        adresse: adresse || null,
        beschreibung,
        zugewiesen_an: zugewiesenAn,
      })
      .eq('id', existingBesichtigung.id as string)
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kalender')
    revalidatePath(`/anfragen/${input.leadId}`)
  } else {
    const kal = await insertKalenderTermin({
      lead_id: input.leadId,
      titel: VOR_ORT_TERMIN_TITEL,
      datum: input.datum,
      uhrzeit_von: input.uhrzeit,
      uhrzeit_bis: null,
      typ: 'besichtigung',
      adresse: adresse || null,
      beschreibung: input.notiz,
      zugewiesen_an: zugewiesenAn,
    })
    if (!kal.ok) return kal
  }

  const zeitLabel = `${input.datum} ${input.uhrzeit}`
  const statusRes = await updateLeadStatus(input.leadId, 'termin', zeitLabel)
  if (!statusRes.ok) {
    if (/enum lead_status/i.test(statusRes.message) && /termin/i.test(statusRes.message)) {
      return {
        ok: false,
        message:
          'Status „Termin“ fehlt in der Datenbank. Bitte Migration supabase/migrations/20260629120000_lead_status_termin.sql im Supabase SQL Editor ausführen.',
      }
    }
    return statusRes
  }

  if (input.mailSenden) {
    const to =
      input.mailTo?.map((e) => e.trim()).filter(Boolean) ??
      (input.kontaktEmail?.trim() ? [input.kontaktEmail.trim()] : [])
    if (!to.length) {
      return { ok: false, message: 'Bitte mindestens eine Empfänger-Adresse unter An angeben.' }
    }
    const { sendBesichtigungTerminBestaetigung } = await import('@/app/actions/mails')
    const mailRes = await sendBesichtigungTerminBestaetigung({
      leadId: input.leadId,
      to,
      cc: input.mailCc?.length ? input.mailCc : undefined,
      name: input.kontaktName.trim() || 'Kundin/Kunde',
      terminTitel: VOR_ORT_TERMIN_TITEL,
      datum: input.datum,
      uhrzeitVon: input.uhrzeit,
      uhrzeitBis: input.uhrzeitBis?.trim() || null,
      adresse: adresse || null,
      notiz: input.notiz,
      zugewiesenAn,
      betreff: input.mailBetreff?.trim() || undefined,
      html: input.mailHtml?.trim() || undefined,
      bodyText: input.mailBodyText,
    })
    if (!mailRes.ok) return mailRes
  }

  return { ok: true }
}

export async function saveLeadRueckfrage(input: {
  leadId: string
  notiz: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = input.notiz.trim()
  if (!text) return { ok: false, message: 'Notiz fehlt.' }

  const notizRes = await addLeadNotizRow(input.leadId, `[Warte auf Antwort] ${text}`)
  if (!notizRes.ok) return notizRes

  await insertLeadTimelineEntry(input.leadId, 'rueckfrage', `Warte auf Antwort: ${text}`, null)

  const markRes = await markLeadKontaktiertWennNeu(input.leadId)
  if (!markRes.ok) return markRes

  if (!markRes.geaendert) {
    revalidatePath(`/anfragen/${input.leadId}`)
    revalidatePath('/anfragen')
  }
  return { ok: true }
}

export async function saveLeadNichtErreichbar(input: {
  leadId: string
  kontaktName: string
  wiedervorlage: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  await insertLeadTimelineEntry(
    input.leadId,
    'kontakt',
    `Nicht erreichbar — Wiedervorlage: ${input.wiedervorlage}`,
    null
  )

  const supabase = createClient()
  const { data: lead } = await supabase.from('leads').select('status').eq('id', input.leadId).maybeSingle()
  if (lead?.status === 'neu') {
    return updateLeadStatus(input.leadId, 'kontaktiert')
  }

  revalidatePath(`/anfragen/${input.leadId}`)
  revalidatePath('/anfragen')
  revalidatePath('/kalender')
  return { ok: true }
}

export async function saveLeadAlsVerloren(input: {
  leadId: string
  grund: string
  notiz: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const grundLabel = VERLOREN_GRUND_LABELS[input.grund] ?? input.grund
  const beschreibung = [grundLabel, input.notiz?.trim()].filter(Boolean).join(' — ')
  return updateLeadStatus(input.leadId, 'abgebrochen', beschreibung || grundLabel)
}

export async function ensureLeadVertriebsAnalyse(
  leadId: string,
  options?: { force?: boolean }
) {
  return ensureLeadVertriebsAnalyseAction(leadId, options)
}

/** Meldung-Lead als Projektanfrage weiterführen (gleiches Objekt / Auftraggeber). */
export async function weiterfuehrenAlsProjekt(
  quellLeadId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: src, error } = await supabase
    .from('leads')
    .select(
      `
      id, kunde_id, auftraggeber_kunde_id, kunde_objekt_id, plz, strasse, hausnummer,
      situation, bereiche, zeitraum, funnel_daten, notizen, kundentyp
    `
    )
    .eq('id', quellLeadId.trim())
    .maybeSingle()

  if (error || !src) return { ok: false, message: error?.message ?? 'Anfrage nicht gefunden.' }

  const row = src as Record<string, unknown>
  const kundeId =
    (row.auftraggeber_kunde_id as string | null)?.trim() ||
    (row.kunde_id as string | null)?.trim() ||
    null

  const { data: neu, error: insErr } = await supabase
    .from('leads')
    .insert({
      kunde_id: kundeId,
      auftraggeber_kunde_id: (row.auftraggeber_kunde_id as string | null) ?? null,
      kunde_objekt_id: (row.kunde_objekt_id as string | null) ?? null,
      kanal: 'sonstiges' as LeadKanal,
      anlass: 'projekt',
      erfassung_von: 'crm',
      status: 'neu' as LeadStatus,
      situation: (row.situation as string | null) ?? 'erneuern',
      bereiche: (row.bereiche as string[] | null) ?? null,
      plz: (row.plz as string | null) ?? null,
      zeitraum: (row.zeitraum as string | null) ?? null,
      kundentyp: (row.kundentyp as string | null) ?? null,
      funnel_daten: row.funnel_daten ?? null,
      notizen: [
        (row.notizen as string | null)?.trim(),
        `Weitergeführt aus Meldung ${quellLeadId.slice(0, 8).toUpperCase()}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      org_freigabe_status: 'nicht_noetig',
      erstellt_von: user?.id ?? null,
    })
    .select('id')
    .single()

  if (insErr || !neu) return { ok: false, message: insErr?.message ?? 'Projekt-Anfrage konnte nicht angelegt werden.' }

  const newId = (neu as { id: string }).id
  await supabase.from('leads_status_history').insert({
    lead_id: newId,
    status_neu: 'neu',
    user_id: user?.id ?? null,
    notiz: `Aus Meldung ${quellLeadId} weitergeführt`,
  })

  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${quellLeadId}`)
  revalidatePath(`/anfragen/${newId}`)
  return { ok: true, id: newId }
}

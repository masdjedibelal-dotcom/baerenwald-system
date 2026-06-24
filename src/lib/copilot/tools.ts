import 'server-only'

import { notifyNewLeadAlert } from '@/lib/copilot/crm-actions'
import { sendMail } from '@/lib/mail-service'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { LeadStatus } from '@/lib/types'

export {
  createAngebotEntwurfCopilot,
  createKundeCopilot,
  getEntity,
  getTermine,
  notifyNewLeadAlert,
  searchCrm,
  sendeAngebotCopilot,
} from '@/lib/copilot/crm-actions'

function parseTerminFromIso(startIso: string, endIso?: string) {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) throw new Error('start_zeit ungültig')
  const pad = (n: number) => String(n).padStart(2, '0')
  const datum = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  const uhrzeit_von = `${pad(start.getHours())}:${pad(start.getMinutes())}:00`
  let uhrzeit_bis: string | null = null
  if (endIso) {
    const end = new Date(endIso)
    if (!Number.isNaN(end.getTime())) {
      uhrzeit_bis = `${pad(end.getHours())}:${pad(end.getMinutes())}:00`
    }
  }
  return { datum, uhrzeit_von, uhrzeit_bis }
}

// ── Lesen ──

export async function getNeueAnfragen() {
  const { data } = await supabaseAdmin
    .from('leads')
    .select(
      `
      id, kontakt_name, kontakt_email, kontakt_telefon,
      situation, bereiche, preis_min, preis_max,
      status, created_at, plz,
      kunden!kunde_id(name)
    `
    )
    .eq('status', 'neu')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function getHeutigeTermine() {
  const heute = new Date().toISOString().split('T')[0]
  const { data } = await supabaseAdmin
    .from('kalender_termine')
    .select(
      `
      id, titel, datum, uhrzeit_von, uhrzeit_bis,
      adresse, beschreibung,
      leads(kontakt_name, plz),
      kunden(name)
    `
    )
    .eq('datum', heute)
    .order('uhrzeit_von', { ascending: true, nullsFirst: false })
  return data ?? []
}

export async function getOffeneAngebote() {
  const { data } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      id, angebotsnr, leistungsumfang,
      gesamt_fix, gesamt_min, gesamt_max,
      status_einfach, gueltig_bis, created_at,
      gesendet_am, gesendet_kunde_at,
      leads(kontakt_name, kunden!kunde_id(name))
    `
    )
    .in('status_einfach', ['entwurf', 'gesendet'])
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function getOffeneRechnungen() {
  const { data } = await supabaseAdmin
    .from('rechnungen')
    .select(
      `
      id, rechnungsnummer, brutto, faellig_am,
      status, created_at, rechnungsdatum,
      kunden(name)
    `
    )
    .eq('status', 'gesendet')
    .order('faellig_am', { ascending: true, nullsFirst: false })
    .limit(15)
  return data ?? []
}

export async function getAuftragStatus() {
  const { data } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id, titel, status, fortschritt,
      start_datum, end_datum, naechster_schritt,
      kunden(name)
    `
    )
    .neq('status', 'abgeschlossen')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function getHandwerkerOffen() {
  const { data } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id, hw_status, hw_eingereicht_at, created_at,
      handwerker(name),
      angebote(leistungsumfang, leads(kontakt_name, kunden!kunde_id(name)))
    `
    )
    .in('hw_status', ['eingereicht', 'offen'])
    .order('created_at', { ascending: false })
    .limit(15)
  return data ?? []
}

// ── Schreiben ──

export async function createTermin(input: {
  titel: string
  start_zeit: string
  end_zeit?: string
  ort?: string
  notizen?: string
  lead_id?: string
  typ?: string
}) {
  const { datum, uhrzeit_von, uhrzeit_bis } = parseTerminFromIso(input.start_zeit, input.end_zeit)
  const { data, error } = await supabaseAdmin
    .from('kalender_termine')
    .insert({
      titel: input.titel,
      typ: input.typ ?? 'sonstiges',
      datum,
      uhrzeit_von,
      uhrzeit_bis,
      adresse: input.ort ?? null,
      beschreibung: input.notizen ?? null,
      lead_id: input.lead_id ?? null,
      erledigt: false,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function createNotiz(input: {
  lead_id?: string
  text: string
}) {
  if (!input.lead_id) throw new Error('lead_id ist für Notizen erforderlich')
  const { error } = await supabaseAdmin.from('lead_notizen').insert({
    lead_id: input.lead_id,
    inhalt: input.text,
  })
  if (error) throw error
  return { ok: true }
}

export async function createLead(input: {
  kontakt_name: string
  kontakt_telefon?: string
  kontakt_email?: string
  kontakt_nachricht?: string
  bereiche?: string[]
  situation?: string
  plz?: string
  kanal?: string
}) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      kontakt_name: input.kontakt_name,
      kontakt_telefon: input.kontakt_telefon ?? null,
      kontakt_email: input.kontakt_email ?? null,
      kontakt_nachricht: input.kontakt_nachricht ?? null,
      bereiche: input.bereiche ?? [],
      situation: input.situation ?? null,
      plz: input.plz ?? null,
      status: 'neu',
      kanal: input.kanal ?? 'telefon',
    })
    .select('id')
    .single()
  if (error) throw error
  void notifyNewLeadAlert(data.id).catch(() => undefined)
  return data
}

export async function updateLeadStatus(leadId: string, status: string) {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ status: status as LeadStatus, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  if (error) throw error
  return { ok: true }
}

export async function sendMailKunde(input: {
  to: string
  name: string
  betreff: string
  text: string
  bestaetigt?: boolean
}) {
  if (!input.bestaetigt) {
    return {
      vorschau: true,
      an: input.to,
      name: input.name,
      betreff: input.betreff,
      text_vorschau: input.text.slice(0, 500),
      hinweis: 'Zum Versand send_mail_kunde mit bestaetigt: true erneut aufrufen.',
    }
  }
  const html = `<p>${input.text.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>`
  const r = await sendMail({
    typ: 'freitext_kunde',
    an: input.to,
    anName: input.name,
    betreff: input.betreff,
    html,
  })
  return { ok: r.success, gesendet: r.success }
}

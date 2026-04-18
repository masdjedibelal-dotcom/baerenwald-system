'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderAngebotPdfBuffer } from '@/lib/pdf/angebot-pdf'
import {
  buildHandwerkerEmailHtml,
  buildKundenAngebotEmailHtml,
  sendHandwerkerAngebotEmail,
  sendKundenAngebotEmail,
  sendTransactionalHtmlEmail,
} from '@/lib/angebote/emails'
import { buildAuftragsbestaetigung, buildHandwerkerAuftragsMail } from '@/lib/angebote/auftrag-mail-templates'
import { projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { isKundeAblehnungGrund } from '@/lib/angebote/ablehnung-labels'
import { sendHandwerkerAnfrageFuerZuweisung } from '@/lib/angebote/send-handwerker-anfrage'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import type {
  AngebotDetail,
  AngebotHandwerkerZuweisungInput,
  AngebotPosition,
  AngebotStatus,
  Kunde,
} from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

async function loadAngebotDetail(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<AngebotDetail | null> {
  const { data, error } = await supabase
    .from('angebote')
    .select(
      `
      *,
      kunden(*),
      leads(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: parsePositionen(row.positionen),
  }
}

async function loadAngebotDetailAdmin(id: string): Promise<AngebotDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      *,
      kunden(*),
      leads(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: parsePositionen(row.positionen),
  }
}

export async function searchKunden(q: string) {
  const term = q.trim()
  if (term.length < 2) return { kunden: [] as Kunde[] }
  const supabase = createClient()
  const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const pattern = `%${esc}%`
  const { data } = await supabase
    .from('kunden')
    .select('id, name, email, telefon, plz, ort, typ, notizen, created_at')
    .ilike('name', pattern)
    .limit(12)

  return { kunden: (data ?? []) as Kunde[] }
}

export async function createKundeQuick(input: {
  name: string
  email: string | null
  telefon: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden')
    .insert({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      telefon: input.telefon?.trim() || null,
      typ: 'privat',
      adresse: null,
      plz: null,
      ort: null,
      notizen: null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Fehler' }
  return { ok: true, id: data.id as string }
}

export type CreateAngebotInput = {
  lead_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  gesamt_min: number
  gesamt_max: number
  notizen: string | null
  /** Mehrere Handwerker pro Gewerk möglich */
  handwerkerZuweisungen: AngebotHandwerkerZuweisungInput[]
}

export async function createAngebot(
  input: CreateAngebotInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const positionen = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(positionen, 19)

  const { data: row, error } = await supabase
    .from('angebote')
    .insert({
      lead_id: input.lead_id,
      kunde_id: input.kunde_id,
      status: 'entwurf' as AngebotStatus,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: input.notizen,
      pdf_url: null,
    })
    .select('id')
    .single()

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  }

  const id = row.id as string

  for (const z of input.handwerkerZuweisungen ?? []) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    await supabase.from('angebot_handwerker').insert({
      angebot_id: id,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: z.status ?? 'ausstehend',
      aufgabe_notiz: z.aufgabe_notiz?.trim() || null,
    })
  }

  revalidatePath('/angebote')
  return { ok: true, id }
}

export async function updateAngebot(
  angebotId: string,
  input: Omit<CreateAngebotInput, 'lead_id'> & { lead_id: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: current, error: loadErr } = await supabase
    .from('angebote')
    .select('id, status')
    .eq('id', angebotId)
    .maybeSingle()

  if (loadErr || !current) return { ok: false, message: 'Angebot nicht gefunden' }
  if (current.status !== 'entwurf') {
    return { ok: false, message: 'Nur Entwürfe können bearbeitet werden' }
  }

  const positionen = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(positionen, 19)

  const { error } = await supabase
    .from('angebote')
    .update({
      lead_id: input.lead_id,
      kunde_id: input.kunde_id,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: input.notizen,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (error) return { ok: false, message: error.message }

  await supabase.from('angebot_handwerker').delete().eq('angebot_id', angebotId)

  for (const z of input.handwerkerZuweisungen ?? []) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    await supabase.from('angebot_handwerker').insert({
      angebot_id: angebotId,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: z.status ?? 'ausstehend',
      aufgabe_notiz: z.aufgabe_notiz?.trim() || null,
    })
  }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true }
}

export async function updateAngebotNotizen(
  angebotId: string,
  notizen: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('angebote')
    .update({ notizen, updated_at: new Date().toISOString() })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true }
}

export async function setAngebotStatus(
  angebotId: string,
  status: AngebotStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('angebote')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/angebote')
  return { ok: true }
}

export async function persistPdfForAngebot(
  angebotId: string
): Promise<{ ok: true; buffer: Buffer; publicUrl: string } | { ok: false; message: string }> {
  const detail = await loadAngebotDetailAdmin(angebotId)
  if (!detail?.kunden) return { ok: false, message: 'Angebot/Kunde nicht gefunden' }

  const kunde = detail.kunden
  const pos = normalizeAngebotPositionen(detail.positionen)
  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const summen = summenAusPositionen(pos, 19)
  const datum = new Date(detail.created_at).toLocaleDateString('de-DE')
  const gueltigTage = Math.max(1, parseInt(firm.angebot_gueltig_tage, 10) || 30)
  const gueltig = new Date(Date.now() + gueltigTage * 24 * 60 * 60 * 1000).toLocaleDateString(
    'de-DE'
  )

  let buffer: Buffer
  try {
    buffer = Buffer.from(
      await renderAngebotPdfBuffer({
        kunde,
        positionen: pos,
        summen,
        angebotDatum: datum,
        gueltigBis: gueltig,
        firm,
      })
    )
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'PDF-Render fehlgeschlagen',
    }
  }

  const path = `${angebotId}/${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('angebote-pdfs')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('angebote-pdfs').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: dbErr } = await supabaseAdmin
    .from('angebote')
    .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', angebotId)

  if (dbErr) return { ok: false, message: dbErr.message }

  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true, buffer, publicUrl }
}

export async function sendAngebotToHandwerker(angebotId: string) {
  const supabase = createClient()
  const detail = await loadAngebotDetail(supabase, angebotId)
  if (!detail?.kunden) return { ok: false as const, message: 'Daten unvollständig' }

  const st = await setAngebotStatus(angebotId, 'gesendet_handwerker')
  if (!st.ok) return st

  const rows = detail.angebot_handwerker ?? []
  const byEmail = new Map<string, { email: string; html: string; subject: string }>()

  for (const r of rows) {
    const email = r.handwerker?.email
    if (!email) continue
    const gewerkName = r.gewerke?.name ?? 'Gewerk'
    const subject = `Neue Anfrage: ${detail.kunden.name} — ${gewerkName}`
    const html = buildHandwerkerEmailHtml({
      kunde: detail.kunden,
      lead: detail.leads ?? null,
      positionen: detail.positionen,
    })
    const existing = byEmail.get(email)
    if (existing) {
      byEmail.set(email, {
        email,
        subject: existing.subject.replace(/ — $/, '') + `, ${gewerkName}`,
        html: existing.html + `<hr/><p>${gewerkName}</p>` + html,
      })
    } else {
      byEmail.set(email, { email, subject, html })
    }
  }

  for (const v of Array.from(byEmail.values())) {
    const sent = await sendHandwerkerAngebotEmail({
      to: v.email,
      subject: v.subject,
      html: v.html,
    })
    if (!sent.ok) return sent
  }

  return { ok: true as const }
}

export async function acceptHandwerker(angebotId: string) {
  return setAngebotStatus(angebotId, 'handwerker_akzeptiert')
}

export async function sendAngebotToKunde(angebotId: string) {
  const supabase = createClient()
  const detail = await loadAngebotDetail(supabase, angebotId)
  if (!detail?.kunden?.email) {
    return { ok: false as const, message: 'Kunden-E-Mail fehlt' }
  }

  const pdf = await persistPdfForAngebot(angebotId)
  if (!pdf.ok) return pdf

  const st = await setAngebotStatus(angebotId, 'gesendet_kunde')
  if (!st.ok) return st

  const now = new Date().toISOString()
  await supabase
    .from('angebote')
    .update({ gesendet_kunde_at: now, updated_at: now })
    .eq('id', angebotId)

  const posMail = normalizeAngebotPositionen(detail.positionen)
  const summenMail = summenAusPositionen(posMail, 19)
  const firmMail = await fetchFirmenEinstellungen(supabase)
  const gueltigTage = Math.max(1, parseInt(firmMail.angebot_gueltig_tage, 10) || 30)
  const gueltig = new Date(
    Date.now() + gueltigTage * 24 * 60 * 60 * 1000
  ).toLocaleDateString('de-DE')

  const html = buildKundenAngebotEmailHtml({
    kunde: detail.kunden,
    gesamtMin: summenMail.nettoMin,
    gesamtMax: summenMail.nettoMax,
    gueltigBis: gueltig,
  })

  const mail = await sendKundenAngebotEmail({
    to: detail.kunden.email,
    subject: 'Ihr Angebot von Bärenwald München',
    html,
    pdfBuffer: pdf.buffer,
    pdfFilename: `angebot-${angebotId}.pdf`,
  })
  if (!mail.ok) return mail

  return { ok: true as const }
}

export async function markKundeAbgelehnt(angebotId: string) {
  return setAngebotStatus(angebotId, 'abgelehnt')
}

export async function recordKundeAbgelehntMitDetails(
  angebotId: string,
  input: {
    grund: string
    konkurrenz_preis_eur: number | null
    notiz: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('angebote')
    .select('id, status')
    .eq('id', angebotId)
    .maybeSingle()
  if (!row) return { ok: false, message: 'Angebot nicht gefunden' }
  if (row.status !== 'gesendet_kunde') {
    return { ok: false, message: 'Ablehnung nur bei Status „Gesendet Kunde“ möglich.' }
  }
  if (!isKundeAblehnungGrund(input.grund)) {
    return { ok: false, message: 'Ungültiger Ablehnungsgrund.' }
  }
  const kp =
    input.konkurrenz_preis_eur != null && Number.isFinite(input.konkurrenz_preis_eur)
      ? Math.round(input.konkurrenz_preis_eur * 100) / 100
      : null
  const { error } = await supabase
    .from('angebote')
    .update({
      status: 'abgelehnt' as AngebotStatus,
      ablehnung_grund: input.grund,
      ablehnung_konkurrenz_preis: kp,
      ablehnung_notiz: input.notiz?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/')
  return { ok: true }
}

export async function schliesseLeadNachAngebotVerlust(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: a } = await supabase
    .from('angebote')
    .select('lead_id, status')
    .eq('id', angebotId)
    .maybeSingle()
  if (!a?.lead_id) return { ok: false, message: 'Kein Lead mit diesem Angebot verknüpft.' }
  if (a.status !== 'abgelehnt') {
    return { ok: false, message: 'Angebot ist nicht als abgelehnt markiert.' }
  }
  const { error } = await supabase
    .from('leads')
    .update({ status: 'abgebrochen', updated_at: new Date().toISOString() })
    .eq('id', a.lead_id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${a.lead_id}`)
  revalidatePath('/anfragen')
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/')
  return { ok: true }
}

export async function planNachfassenTerminFuerAngebot(input: {
  angebotId: string
  datum: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const detail = await loadAngebotDetail(supabase, input.angebotId)
  if (!detail?.lead_id) return { ok: false, message: 'Kein Lead verknüpft.' }
  const kunde = detail.kunden?.name?.trim() || 'Kunde'
  const r = await saveKalenderTermin({
    titel: `Nachfassen: ${kunde}`,
    typ: 'sonstiges',
    datum: input.datum,
    uhrzeit_von: null,
    uhrzeit_bis: null,
    adresse: null,
    beschreibung: `Angebot ${input.angebotId} — Kunde hat abgelehnt, erneut kontaktieren.`,
    lead_id: detail.lead_id,
    auftrag_id: null,
  })
  if (!r.ok) return r
  revalidatePath(`/angebote/${input.angebotId}`)
  revalidatePath('/kalender')
  return { ok: true }
}

export type HandwerkerGewerkListeEintrag = {
  id: string
  name: string
  firma: string | null
  telefon: string | null
  letzter_einsatz: string | null
  verfuegbar: boolean
}

export async function listHandwerkerFuerGewerk(
  gewerkId: string
): Promise<
  { ok: true; handwerker: HandwerkerGewerkListeEintrag[] } | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: gw, error: gErr } = await supabase
    .from('gewerke')
    .select('slug')
    .eq('id', gewerkId)
    .maybeSingle()
  if (gErr || !gw?.slug) return { ok: false, message: 'Gewerk nicht gefunden' }

  const { data: allHw, error: hErr } = await supabase
    .from('handwerker')
    .select('id, name, firma, telefon, gewerke, aktiv')
    .eq('aktiv', true)
  if (hErr) return { ok: false, message: hErr.message }

  const slug = gw.slug as string
  const filtered = (allHw ?? []).filter((h) => {
    const g = (h.gewerke as string[] | null) ?? []
    return g.includes(slug)
  })

  const ids = filtered.map((h) => h.id)
  const lastByHw = new Map<string, string>()
  const busyIds = new Set<string>()
  if (ids.length) {
    const { data: ah } = await supabase
      .from('auftrag_handwerker')
      .select('handwerker_id, auftraege(created_at, status)')
      .in('handwerker_id', ids)
    for (const row of ah ?? []) {
      const hid = row.handwerker_id as string
      const auf = row.auftraege as { created_at?: string; status?: string } | { created_at?: string; status?: string }[] | null
      const a = Array.isArray(auf) ? auf[0] : auf
      if (a?.created_at) {
        const cur = lastByHw.get(hid)
        if (!cur || a.created_at > cur) lastByHw.set(hid, a.created_at)
      }
      if (a?.status === 'offen' || a?.status === 'in_arbeit') busyIds.add(hid)
    }
  }

  return {
    ok: true,
    handwerker: filtered.map((h) => ({
      id: h.id as string,
      name: h.name as string,
      firma: (h.firma as string | null) ?? null,
      telefon: (h.telefon as string | null) ?? null,
      letzter_einsatz: lastByHw.get(h.id as string) ?? null,
      verfuegbar: !busyIds.has(h.id as string),
    })),
  }
}

export async function replaceAngebotHandwerkerUndSenden(input: {
  angebotId: string
  alteZuweisungId: string
  neuerHandwerkerId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: zuAlt, error: zErr } = await supabase
    .from('angebot_handwerker')
    .select('id, gewerk_id, handwerker_id, status')
    .eq('id', input.alteZuweisungId)
    .eq('angebot_id', input.angebotId)
    .maybeSingle()

  if (zErr || !zuAlt) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (zuAlt.status !== 'abgelehnt') {
    return { ok: false, message: 'Nur abgelehnte Zuweisungen können ersetzt werden.' }
  }
  if (zuAlt.handwerker_id === input.neuerHandwerkerId) {
    return { ok: false, message: 'Bitte eine andere Handwerkerin auswählen.' }
  }

  const { data: gw } = await supabase
    .from('gewerke')
    .select('slug')
    .eq('id', zuAlt.gewerk_id)
    .maybeSingle()
  const { data: hwNeu } = await supabase
    .from('handwerker')
    .select('id, gewerke, aktiv')
    .eq('id', input.neuerHandwerkerId)
    .maybeSingle()

  if (!gw?.slug || !hwNeu?.aktiv) return { ok: false, message: 'Daten ungültig' }
  const slugs = (hwNeu.gewerke as string[] | null) ?? []
  if (!slugs.includes(gw.slug as string)) {
    return { ok: false, message: 'Handwerker deckt dieses Gewerk nicht ab.' }
  }

  const { error: upAlt } = await supabase
    .from('angebot_handwerker')
    .update({ status: 'ersetzt' })
    .eq('id', input.alteZuweisungId)
  if (upAlt) return { ok: false, message: upAlt.message }

  const { data: inserted, error: insErr } = await supabase
    .from('angebot_handwerker')
    .insert({
      angebot_id: input.angebotId,
      gewerk_id: zuAlt.gewerk_id,
      handwerker_id: input.neuerHandwerkerId,
      status: 'ausstehend',
    })
    .select(
      `
      id,
      angebot_id,
      gewerk_id,
      token,
      status,
      handwerker(id, name, email, telefon),
      gewerke(name)
    `
    )
    .single()

  if (insErr || !inserted) {
    return { ok: false, message: insErr?.message ?? 'Einfügen fehlgeschlagen' }
  }

  const detail = await loadAngebotDetailAdmin(input.angebotId)
  if (!detail?.kunden) {
    return { ok: false, message: 'Angebot nicht gefunden' }
  }

  const send = await sendHandwerkerAnfrageFuerZuweisung(
    detail,
    inserted as Record<string, unknown>,
    true
  )
  if (!send.ok) {
    return { ok: false, message: send.message }
  }

  revalidatePath(`/angebote/${input.angebotId}`)
  revalidatePath('/angebote')
  revalidatePath('/')
  return { ok: true }
}

function addDaysIso(ymd: string, n: number): string {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function defaultStartDatum(): string {
  return addDaysIso(new Date().toISOString().slice(0, 10), 7)
}

export type CreateAuftragFromAngebotOptions = {
  start_datum: string | null
  end_datum: string | null
  notizen: string | null
  send_kunden_email: boolean
  send_handwerker_email: boolean
}

export async function createAuftragFromAngebot(
  angebotId: string,
  opts?: Partial<CreateAuftragFromAngebotOptions>
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const angebot = await loadAngebotDetailAdmin(angebotId)
  if (!angebot?.kunden) return { ok: false, message: 'Angebot nicht gefunden' }
  if (angebot.status !== 'kunde_akzeptiert') {
    return { ok: false, message: 'Auftrag nur nach Kundenakzept möglich.' }
  }

  const start = opts?.start_datum?.trim() || defaultStartDatum()
  const end = opts?.end_datum?.trim() || addDaysIso(start, 14)
  const notizenAuftrag = opts?.notizen?.trim() || null
  const sendKunde = opts?.send_kunden_email ?? true
  const sendHw = opts?.send_handwerker_email ?? true

  const pos = normalizeAngebotPositionen(angebot.positionen)
  const gewerkNamen = Array.from(new Set(pos.map((p) => p.gewerk_name).filter(Boolean)))
  const titel = `${gewerkNamen.join(', ')} — ${angebot.kunden.name}`.slice(0, 240)

  const hwRows = (angebot.angebot_handwerker ?? []).filter((h) => h.status === 'akzeptiert')
  if (!hwRows.length) {
    return { ok: false, message: 'Kein Handwerker hat die Anfrage akzeptiert.' }
  }

  const kundenToken = randomBytes(32).toString('hex')

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .insert({
      angebot_id: angebotId,
      lead_id: angebot.lead_id,
      kunde_id: angebot.kunde_id,
      status: 'offen',
      titel,
      notizen: notizenAuftrag,
      start_datum: start,
      end_datum: end,
      abnahme_datum: null,
      abnahme_protokoll_url: null,
      kunden_token: kundenToken,
    })
    .select('id, kunden_token')
    .single()

  if (aErr || !auftrag) return { ok: false, message: aErr?.message ?? 'Auftrag fehlgeschlagen' }

  const auftragId = auftrag.id as string
  const projektLink = projektUrlFromToken((auftrag as { kunden_token?: string }).kunden_token ?? kundenToken)

  const { error: hErr } = await supabaseAdmin.from('auftrag_handwerker').insert(
    hwRows.map((h) => ({
      auftrag_id: auftragId,
      handwerker_id: h.handwerker_id,
      gewerk_id: h.gewerk_id,
      status: 'zugewiesen',
    }))
  )
  if (hErr) return { ok: false, message: hErr.message }

  if (angebot.lead_id) {
    await supabaseAdmin
      .from('leads')
      .update({ status: 'auftrag', updated_at: new Date().toISOString() })
      .eq('id', angebot.lead_id)
  }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const kunde = angebot.kunden
  const vorname = kunde.name.trim().split(/\s+/)[0] || kunde.name.trim()
  const plzKunde = kunde.plz?.trim() || angebot.leads?.plz?.trim() || '—'

  if (sendKunde && kunde.email?.trim()) {
    const hwNamen = Array.from(
      new Set(hwRows.map((z) => z.handwerker?.name?.trim()).filter(Boolean) as string[])
    )
    const htmlK = buildAuftragsbestaetigung({
      name: vorname,
      gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
      start_datum: start,
      end_datum: end,
      handwerker_liste: hwNamen,
      firm,
      projektLink,
    })
    await sendTransactionalHtmlEmail({
      to: kunde.email.trim(),
      subject: 'Ihr Auftrag ist bestätigt — Bärenwald München',
      html: htmlK,
    })
  }

  if (sendHw) {
    for (const z of hwRows) {
      const email = z.handwerker?.email?.trim()
      if (!email) continue
      const gewerkName = z.gewerke?.name ?? 'Gewerk'
      const posFiltered = pos.filter((p) => p.gewerk_id === z.gewerk_id)
      const htmlH = buildHandwerkerAuftragsMail({
        handwerker_name: z.handwerker?.name ?? 'Handwerkerin',
        gewerk_name: gewerkName,
        kunde_plz: plzKunde,
        start_datum: start,
        end_datum: end,
        positionen: (posFiltered.length ? posFiltered : pos).map((p) => ({
          beschreibung: p.beschreibung || p.leistung,
          menge: p.menge,
          einheit: p.einheit,
        })),
        notizen: notizenAuftrag,
        firm,
      })
      await sendTransactionalHtmlEmail({
        to: email,
        subject: `Auftrag bestätigt: ${gewerkName} — Bärenwald`,
        html: htmlH,
      })
    }
  }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'auftrag_erstellt',
    titel: 'Auftrag erstellt',
    beschreibung: `Aus Angebot ${angebotId.slice(0, 8).toUpperCase()} · ${titel}`,
  })
  if (sendKunde && kunde.email?.trim()) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'mail_kunde',
      titel: 'E-Mail an Kundin (Auftragsbestätigung)',
      beschreibung: `An ${kunde.email.trim()}`,
      sichtbar_fuer_kunde: true,
    })
  }
  if (sendHw) {
    for (const z of hwRows) {
      const email = z.handwerker?.email?.trim()
      if (!email) continue
      await insertAuftragTimelineEvent({
        auftrag_id: auftragId,
        typ: 'mail_handwerker',
        titel: `E-Mail an Handwerker: ${z.handwerker?.name ?? '—'}`,
        beschreibung: `An ${email}`,
        handwerker_id: z.handwerker_id,
      })
    }
  }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/auftraege')
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/anfragen')
  revalidatePath('/')

  return { ok: true, auftragId }
}

export async function markKundeAkzeptiert(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('angebote')
    .select('id, status')
    .eq('id', angebotId)
    .maybeSingle()
  if (!row) return { ok: false, message: 'Angebot nicht gefunden' }
  if (row.status !== 'gesendet_kunde') {
    return { ok: false, message: 'Nur bei Status „Gesendet Kunde“ möglich.' }
  }
  return setAngebotStatus(angebotId, 'kunde_akzeptiert')
}

'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderAngebotPdfBuffer } from '@/lib/pdf/angebot-pdf'
import { sendMail } from '@/lib/mail-service'
import { getMailBranding } from '@/lib/mail-branding'
import { mailAngebot, mailAuftragsbestaetigung, mailHandwerkerAnfrage } from '@/lib/mail-templates'
import { formatDatumDeFromIso, projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { getPublicAppUrl } from '@/lib/utils'
import { isKundeAblehnungGrund } from '@/lib/angebote/ablehnung-labels'
import { sendHandwerkerAnfrageFuerZuweisung } from '@/lib/angebote/send-handwerker-anfrage'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import type {
  AngebotDetail,
  AngebotHandwerkerZuweisungInput,
  AngebotPosition,
  AngebotStatus,
  AngebotVorlage,
  Kunde,
  PreisTyp,
} from '@/lib/types'
import {
  handwerkerZuweisungenFromPositionen,
  normalizeAngebotPositionen,
  summenAusPositionen,
} from '@/lib/angebot-positionen'
import { angebotPositionenToAuftragRows } from '@/lib/auftrag-positionen-map'
import { addDaysYmd, insertKalenderAutoTermin } from '@/lib/kalender-auto-termine'
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
  preis_typ?: PreisTyp | null
  vorlage_id?: string | null
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
      preis_typ: input.preis_typ ?? 'fix',
      vorlage_id: input.vorlage_id ?? null,
    })
    .select('id')
    .single()

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  }

  const id = row.id as string

  const hwZu = handwerkerZuweisungenFromPositionen(positionen)
  for (const z of hwZu) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    await supabase.from('angebot_handwerker').insert({
      angebot_id: id,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: z.status ?? 'ausstehend',
      aufgabe_notiz: z.aufgabe_notiz?.trim() || null,
    })
  }

  if (input.lead_id) {
    await supabase
      .from('leads')
      .update({ status: 'angebot', updated_at: new Date().toISOString() })
      .eq('id', input.lead_id)
  }

  revalidatePath('/angebote')
  if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
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
      preis_typ: input.preis_typ ?? 'fix',
      vorlage_id: input.vorlage_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (error) return { ok: false, message: error.message }

  const { data: prevHw } = await supabase
    .from('angebot_handwerker')
    .select('gewerk_id, handwerker_id, status, aufgabe_notiz')
    .eq('angebot_id', angebotId)

  const prevHwMap = new Map<
    string,
    { status: string; aufgabe_notiz: string | null }
  >()
  for (const r of prevHw ?? []) {
    const g = r.gewerk_id as string
    const h = r.handwerker_id as string
    if (!g || !h) continue
    prevHwMap.set(`${g}|${h}`, {
      status: String((r as { status?: string }).status ?? 'ausstehend'),
      aufgabe_notiz: (r as { aufgabe_notiz?: string | null }).aufgabe_notiz ?? null,
    })
  }

  await supabase.from('angebot_handwerker').delete().eq('angebot_id', angebotId)

  const hwZu = handwerkerZuweisungenFromPositionen(positionen)
  for (const z of hwZu) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    const key = `${z.gewerk_id}|${z.handwerker_id}`
    const prev = prevHwMap.get(key)
    await supabase.from('angebot_handwerker').insert({
      angebot_id: angebotId,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: (prev?.status as AngebotHandwerkerZuweisungInput['status']) ?? z.status ?? 'ausstehend',
      aufgabe_notiz: prev?.aufgabe_notiz ?? z.aufgabe_notiz?.trim() ?? null,
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
  const now = new Date().toISOString()
  const extra: Record<string, string> = {}
  if (status === 'gesendet_handwerker') extra.gesendet_handwerker_at = now
  if (status === 'gesendet_kunde') extra.gesendet_kunde_at = now

  const { error } = await supabase
    .from('angebote')
    .update({ status, updated_at: now, ...extra })
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

  if (upErr) {
    const raw = upErr.message ?? ''
    const hint =
      /bucket not found|bucket.*does not exist|storage.*not found/i.test(raw)
        ? ' — Speicher-Bucket „angebote-pdfs“ fehlt: Migration `20260424180000_storage_angebote_pdfs.sql` ausführen oder in Supabase → Storage einen öffentlichen Bucket `angebote-pdfs` (nur PDF) anlegen.'
        : ''
    return { ok: false, message: raw + hint }
  }

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

  const branding = await getMailBranding(supabaseAdmin)
  const rows = detail.angebot_handwerker ?? []
  const posAll = normalizeAngebotPositionen(detail.positionen)
  const plz = detail.kunden.plz?.trim() || detail.leads?.plz?.trim() || '—'
  const zeitraum = detail.leads?.zeitraum?.trim() || ''

  for (const r of rows) {
    const email = r.handwerker?.email?.trim()
    if (!email) continue
    const gewerkName = r.gewerke?.name ?? 'Gewerk'
    const tok = (r as { token?: string | null }).token?.trim()
    if (!tok) continue
    const link = `${getPublicAppUrl()}/handwerker/anfrage/${tok}`
    const posFiltered = posAll.filter((p) => p.gewerk_id === r.gewerk_id)
    const tpl = mailHandwerkerAnfrage(
      {
        name: r.handwerker?.name ?? 'Guten Tag',
        gewerk: gewerkName,
        plz,
        zeitraum: zeitraum || undefined,
        positionen: (posFiltered.length ? posFiltered : posAll).map((p) => ({
          beschreibung: p.beschreibung || p.leistung,
        })),
        link,
      },
      branding
    )
    const sent = await sendMail({
      typ: 'handwerker_anfrage',
      an: email,
      anName: r.handwerker?.name ?? null,
      betreff: tpl.betreff,
      html: tpl.html,
      kundeId: detail.kunde_id,
      leadId: detail.lead_id,
      angebotId,
    })
    if (!sent.success) return { ok: false as const, message: sent.error ?? 'Versand fehlgeschlagen' }
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

  const branding = await getMailBranding(supabaseAdmin)
  const statusLink = await projektOderStatusLink(detail.lead_id)
  const vorname = detail.kunden.name.trim().split(/\s+/)[0] || detail.kunden.name.trim()
  const tpl = mailAngebot(
    {
      name: vorname,
      positionen: posMail,
      gesamt_min: summenMail.nettoMin,
      gesamt_max: summenMail.nettoMax,
      lohn_gesamt: summenMail.lohnZeileMin,
      gueltig_bis: gueltig,
      statusLink,
    },
    branding
  )

  const mail = await sendMail({
    typ: 'angebot',
    an: detail.kunden.email.trim(),
    anName: detail.kunden.name,
    betreff: tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: `angebot-${angebotId}.pdf`,
    kundeId: detail.kunde_id,
    leadId: detail.lead_id,
    angebotId,
  })
  if (!mail.success) return { ok: false as const, message: mail.error ?? 'Versand fehlgeschlagen' }

  const nachfassenDatum = addDaysYmd(new Date().toISOString().slice(0, 10), 3)
  await insertKalenderAutoTermin({
    titel: `Nachfassen: ${detail.kunden.name}`,
    datum: nachfassenDatum,
    typ: 'sonstiges',
    lead_id: detail.lead_id ?? null,
  })

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
      fortschritt: 0,
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

  const posRows = angebotPositionenToAuftragRows(auftragId, pos)
  if (posRows.length) {
    const { error: posErr } = await supabaseAdmin.from('auftrag_positionen').insert(posRows)
    if (posErr) console.warn('[auftrag_positionen]', posErr.message)
  }

  await insertKalenderAutoTermin({
    titel: `Start: ${titel}`,
    datum: start,
    typ: 'beginn',
    lead_id: angebot.lead_id ?? null,
    auftrag_id: auftragId,
  })
  await insertKalenderAutoTermin({
    titel: `Abnahme: ${titel}`,
    datum: end,
    typ: 'abnahme',
    lead_id: angebot.lead_id ?? null,
    auftrag_id: auftragId,
  })

  if (angebot.lead_id) {
    await supabaseAdmin
      .from('leads')
      .update({ status: 'auftrag', updated_at: new Date().toISOString() })
      .eq('id', angebot.lead_id)
  }

  const branding = await getMailBranding(supabaseAdmin)
  const kunde = angebot.kunden
  const vorname = kunde.name.trim().split(/\s+/)[0] || kunde.name.trim()
  const plzKunde = kunde.plz?.trim() || angebot.leads?.plz?.trim() || '—'

  if (sendKunde && kunde.email?.trim()) {
    const tplK = mailAuftragsbestaetigung(
      {
        name: vorname,
        gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
        startDatum: formatDatumDeFromIso(start),
        endDatum: formatDatumDeFromIso(end),
        statusLink: projektLink,
      },
      branding
    )
    await sendMail({
      typ: 'auftragsbestaetigung',
      an: kunde.email.trim(),
      anName: kunde.name,
      betreff: tplK.betreff,
      html: tplK.html,
      kundeId: angebot.kunde_id,
      leadId: angebot.lead_id,
      angebotId,
      auftragId,
    })
  }

  if (sendHw) {
    const partnerLink = `${getPublicAppUrl()}/partner`
    for (const z of hwRows) {
      const email = z.handwerker?.email?.trim()
      if (!email) continue
      const gewerkName = z.gewerke?.name ?? 'Gewerk'
      const posFiltered = pos.filter((p) => p.gewerk_id === z.gewerk_id)
      const zeitraum =
        notizenAuftrag?.trim() != null && notizenAuftrag.trim() !== ''
          ? `${formatDatumDeFromIso(start)} – ${formatDatumDeFromIso(end)} · ${notizenAuftrag.trim()}`
          : `${formatDatumDeFromIso(start)} – ${formatDatumDeFromIso(end)}`
      const tplH = mailHandwerkerAnfrage(
        {
          name: z.handwerker?.name ?? 'Guten Tag',
          gewerk: gewerkName,
          plz: plzKunde,
          zeitraum,
          positionen: (posFiltered.length ? posFiltered : pos).map((p) => ({
            beschreibung: [p.beschreibung || p.leistung, `${p.menge} ${p.einheit}`].filter(Boolean).join(' · '),
          })),
          link: partnerLink,
        },
        branding
      )
      await sendMail({
        typ: 'handwerker_anfrage',
        an: email,
        anName: z.handwerker?.name ?? null,
        betreff: tplH.betreff,
        html: tplH.html,
        kundeId: angebot.kunde_id,
        leadId: angebot.lead_id,
        angebotId,
        auftragId,
      })
    }
  }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'auftrag_erstellt',
    titel: 'Auftrag erstellt',
    beschreibung: `Aus Angebot ${angebotId.slice(0, 8).toUpperCase()} · ${titel}`,
  })

  await supabaseAdmin.from('auftrag_milestones').insert({
    auftrag_id: auftragId,
    titel: 'Auftrag erstellt',
    erledigt: true,
    erledigt_at: new Date().toISOString(),
    fuer_kunden_sichtbar: true,
    ist_system: true,
    sort_order: 0,
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

export async function listAngebotVorlagen(): Promise<AngebotVorlage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .eq('aktiv', true)
    .order('name', { ascending: true })
  if (error) {
    console.warn('listAngebotVorlagen', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    ...(row as AngebotVorlage),
    positionen: normalizeAngebotPositionen((row as { positionen: unknown }).positionen),
  }))
}

function prepareVorlagePositionenForDb(
  positionen: AngebotPosition[],
  mitPreisen: boolean
): AngebotPosition[] {
  let pos = normalizeAngebotPositionen(positionen).map((p) => {
    const { handwerker_id, handwerker_name, ...rest } = p
    void handwerker_id
    void handwerker_name
    return rest
  })
  if (!mitPreisen) {
    pos = pos.map((p) => ({
      ...p,
      preis_typ: 'fix' as const,
      lohn_netto: 0,
      material_netto: 0,
      gesamt_min: 0,
      gesamt_max: 0,
      einkaufspreis: undefined,
    }))
  }
  return pos
}

export async function listAngebotVorlagenEinstellungen(): Promise<AngebotVorlage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('listAngebotVorlagenEinstellungen', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    ...(row as AngebotVorlage),
    positionen: normalizeAngebotPositionen((row as { positionen: unknown }).positionen),
  }))
}

export async function saveAngebotVorlage(
  name: string,
  beschreibung: string | null,
  positionen: AngebotPosition[],
  mitPreisen: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pos = prepareVorlagePositionenForDb(positionen, mitPreisen)
  const summen = summenAusPositionen(pos, 19)
  const fix =
    Math.abs(summen.nettoMin - summen.nettoMax) < 0.01 ? summen.nettoMin : null
  const { error } = await supabase.from('angebot_vorlagen').insert({
    name: name.trim(),
    beschreibung: beschreibung?.trim() || null,
    positionen: pos,
    gesamt_min: summen.nettoMin,
    gesamt_max: summen.nettoMax,
    gesamt_fix: fix,
    aktiv: true,
    erstellt_von: user?.id ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote/neu')
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

export async function updateAngebotVorlage(
  id: string,
  name: string,
  beschreibung: string | null,
  positionen: AngebotPosition[],
  mitPreisen: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const pos = prepareVorlagePositionenForDb(positionen, mitPreisen)
  const summen = summenAusPositionen(pos, 19)
  const fix =
    Math.abs(summen.nettoMin - summen.nettoMax) < 0.01 ? summen.nettoMin : null
  const { error } = await supabase
    .from('angebot_vorlagen')
    .update({
      name: name.trim(),
      beschreibung: beschreibung?.trim() || null,
      positionen: pos,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      gesamt_fix: fix,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote/neu')
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

export async function deleteAngebot(
  angebotId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = createClient()
  const { data: auf } = await supabase.from('auftraege').select('id').eq('angebot_id', angebotId).maybeSingle()
  if (auf) {
    return {
      error: 'Angebot kann nicht gelöscht werden — es existiert bereits ein Auftrag dazu.',
    }
  }
  const { data: ang } = await supabase.from('angebote').select('lead_id').eq('id', angebotId).maybeSingle()
  const { error: delHw } = await supabase.from('angebot_handwerker').delete().eq('angebot_id', angebotId)
  if (delHw) return { error: delHw.message }
  const { error } = await supabase.from('angebote').delete().eq('id', angebotId)
  if (error) return { error: error.message }
  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  const leadId = (ang as { lead_id?: string | null } | null)?.lead_id
  if (leadId) revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { success: true }
}

export async function deleteAngebotVorlage(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('angebot_vorlagen').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/vorlagen')
  revalidatePath('/angebote/neu')
  return { ok: true }
}

export async function duplicateAngebotVorlage(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: row, error: loadErr } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !row) return { ok: false, message: loadErr?.message ?? 'Vorlage nicht gefunden' }

  const r = row as Record<string, unknown>
  const { error } = await supabase.from('angebot_vorlagen').insert({
    name: `Kopie: ${String(r.name ?? 'Vorlage')}`,
    beschreibung: (r.beschreibung as string | null) ?? null,
    positionen: r.positionen,
    gesamt_min: r.gesamt_min,
    gesamt_max: r.gesamt_max,
    gesamt_fix: r.gesamt_fix,
    aktiv: r.aktiv ?? true,
    erstellt_von: user?.id ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

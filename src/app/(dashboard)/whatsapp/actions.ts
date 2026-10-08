'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { writeEinsatzStatus } from '@/lib/status/write-einsatz-status'
import { DOKUMENT_ARTEN,type DokumentArt } from '@/lib/types'
import {
aktiveEinsaetze,
bautagebuchPerWhatsApp,
imFenster,
kontaktLaden,
nachrichtSenden,
webhookVerarbeiten,
WHATSAPP_MEDIEN_BUCKET,
type WaKontakt,
} from '@/lib/whatsapp/dienst'
import { whatsappKonfig } from '@/lib/whatsapp/konfig'
import { gespraechSchluessel } from '@/lib/whatsapp/schluessel'
import { mockWebhookPayload } from '@/lib/whatsapp/webhook-parse'

/**
 * WhatsApp im CRM: Verlauf je Partner/Kunde, Senden, Zuordnen zu Auftrag/Einsatz,
 * Übernehmen als Update/Regie, Speichern als Dokument. Testmodus: Antworten simulieren.
 */

/** Kontakt eines Chats: Partner, Kunde oder (unbekannte) Nummer */
export type WaZiel = { handwerkerId?: string | null; kundeId?: string | null; telefon?: string | null }

export type WaNachricht = {
  id: string
  created_at: string
  richtung: 'ein' | 'aus'
  art: string
  text: string | null
  /** url zum Anzeigen/Abspielen, download erzwingt „Speichern unter“ */
  medium: { url: string; download: string; name: string; mime: string | null } | null
  knoepfe: { id: string; titel: string }[]
  knopf_id: string | null
  vorlage: string | null
  status: string
  fehler: string | null
  markierung: 'update' | 'regie' | 'erledigt' | 'tagebuch' | 'dokument' | 'fertig' | null
  auftrag_id: string | null
  einsatz_id: string | null
  auftrag_titel: string | null
  einsatz_titel: string | null
  ungelesen: boolean
}

export type WaLaufend = { id: string; auftrag_id: string; titel: string; status: string; auftrag_titel: string }

export type WaVerlauf = {
  kontakt: WaKontakt | null
  /** Nummer fehlt → kein Senden möglich */
  ohneNummer: boolean
  nachrichten: WaNachricht[]
  /** Laufende Einsätze (Partner) bzw. Aufträge (Kunde) zum Zuordnen */
  laufend: WaLaufend[]
  imFenster: boolean
  modus: 'mock' | 'twilio'
}

export type WaStatusInfo = { sichtbar: boolean; modus: 'mock' | 'twilio'; nummer: string | null }

type Fail = { ok: false; message: string }

export async function whatsappStatus(): Promise<WaStatusInfo> {
  const k = whatsappKonfig()
  return { sichtbar: k.sichtbar, modus: k.modus, nummer: k.nummer }
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

const SELECT =
  'id, created_at, richtung, art, text, media_pfad, media_url, media_name, media_mime, knoepfe, knopf_id, vorlage, status, fehler, markierung, auftrag_id, einsatz_id, gelesen_at, wa_id, auftraege(titel), einsaetze(titel)'

async function mapNachrichten(db: SupabaseClient, rows: Record<string, unknown>[]): Promise<WaNachricht[]> {
  const bucket = db.storage.from(WHATSAPP_MEDIEN_BUCKET)
  return Promise.all(
    rows.map(async (r) => {
      const name = String(r.media_name ?? 'Datei')
      let url = String(r.media_url ?? '').trim() || null
      let download = url
      if (!url && r.media_pfad) {
        const [anzeigen, laden] = await Promise.all([
          bucket.createSignedUrl(String(r.media_pfad), 60 * 60),
          bucket.createSignedUrl(String(r.media_pfad), 60 * 60, { download: name }),
        ])
        url = anzeigen.data?.signedUrl ?? null
        download = laden.data?.signedUrl ?? url
      }
      const mark = r.markierung
      return {
        id: String(r.id),
        created_at: String(r.created_at),
        richtung: r.richtung === 'aus' ? 'aus' : 'ein',
        art: String(r.art ?? 'text'),
        text: (r.text as string | null) ?? null,
        medium: url ? { url, download: download ?? url, name, mime: (r.media_mime as string | null) ?? null } : null,
        knoepfe: Array.isArray(r.knoepfe) ? (r.knoepfe as { id: string; titel: string }[]) : [],
        knopf_id: (r.knopf_id as string | null) ?? null,
        vorlage: (r.vorlage as string | null) ?? null,
        status: String(r.status ?? ''),
        fehler: (r.fehler as string | null) ?? null,
        markierung: (['update', 'regie', 'erledigt', 'tagebuch', 'dokument', 'fertig'] as const).find((m) => m === mark) ?? null,
        auftrag_id: (r.auftrag_id as string | null) ?? null,
        einsatz_id: (r.einsatz_id as string | null) ?? null,
        auftrag_titel: one(r.auftraege as { titel?: string | null } | null)?.titel ?? null,
        einsatz_titel: one(r.einsaetze as { titel?: string | null } | null)?.titel ?? null,
        ungelesen: r.richtung === 'ein' && !r.gelesen_at,
      }
    })
  )
}

async function laufendLaden(db: SupabaseClient, kontakt: WaKontakt | null, ziel: WaZiel): Promise<WaLaufend[]> {
  if (ziel.handwerkerId) {
    const liste = await aktiveEinsaetze(db, ziel.handwerkerId)
    if (!liste.length) return []
    const { data } = await db.from('auftraege').select('id, titel').in('id', [...new Set(liste.map((e) => e.auftrag_id))])
    const titel = new Map((data ?? []).map((a) => [String(a.id), String(a.titel ?? '')]))
    return liste.map((e) => ({ ...e, auftrag_titel: titel.get(e.auftrag_id) ?? '' }))
  }
  if (ziel.kundeId) {
    const { data } = await db
      .from('auftraege')
      .select('id, titel, status')
      .eq('kunde_id', ziel.kundeId)
      .in('status', ['offen', 'in_arbeit'])
      .order('created_at', { ascending: false })
    return (data ?? []).map((a) => ({
      id: String(a.id),
      auftrag_id: String(a.id),
      titel: String(a.titel ?? ''),
      status: String(a.status),
      auftrag_titel: String(a.titel ?? ''),
    }))
  }
  void kontakt
  return []
}

/** Verlauf eines Kontakts (älteste zuerst). `gelesen`: eingehende als gelesen markieren. */
export async function ladeWhatsAppVerlauf(
  ziel: WaZiel,
  opts: { gelesen?: boolean } = {}
): Promise<({ ok: true } & WaVerlauf) | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  if (!ziel.handwerkerId && !ziel.kundeId && !ziel.telefon) return { ok: false, message: 'Kein Kontakt gewählt.' }
  const kontakt = await kontaktLaden(gate.db, ziel)
  let q = gate.db.from('whatsapp_nachrichten').select(SELECT).order('created_at', { ascending: true }).limit(500)
  q = ziel.handwerkerId
    ? q.eq('handwerker_id', ziel.handwerkerId)
    : ziel.kundeId
      ? q.eq('kunde_id', ziel.kundeId)
      : q.eq('telefon', kontakt?.nummer ?? String(ziel.telefon)).eq('kontakt_typ', 'unbekannt')
  const { data, error } = await q
  if (error) {
    logDbError('app/whatsapp/actions:verlauf', error)
    return { ok: false, message: 'WhatsApp-Verlauf konnte nicht geladen werden.' }
  }
  const rows = (data ?? []) as Record<string, unknown>[]
  if (opts.gelesen) {
    const ungelesen = rows.filter((r) => r.richtung === 'ein' && !r.gelesen_at)
    if (ungelesen.length) {
      const now = new Date().toISOString()
      await gate.db
        .from('whatsapp_nachrichten')
        .update({ gelesen_at: now })
        .in('id', ungelesen.map((r) => String(r.id)))
    }
  }
  return {
    ok: true,
    kontakt,
    ohneNummer: !kontakt,
    nachrichten: await mapNachrichten(gate.db, rows),
    laufend: await laufendLaden(gate.db, kontakt, ziel),
    imFenster: kontakt ? await imFenster(gate.db, kontakt.nummer) : false,
    modus: whatsappKonfig().modus,
  }
}

function vorschau(r: { art?: unknown; text?: unknown; media_name?: unknown }): string {
  const t = String(r.text ?? '').trim()
  if (t) return t.replace(/\s+/g, ' ').slice(0, 90)
  if (r.art === 'bild') return 'Foto'
  if (r.art === 'dokument') return String(r.media_name ?? 'Dokument')
  return 'Nachricht'
}

export async function sendeWhatsApp(input: {
  ziel: WaZiel
  text: string
  auftragId?: string | null
  einsatzId?: string | null
}): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const kontakt = await kontaktLaden(gate.db, input.ziel)
  if (!kontakt) return { ok: false, message: 'Keine Handynummer hinterlegt.' }
  const einsatzId = await einsatzImAuftrag(gate.db, kontakt, input.auftragId, input.einsatzId)
  const r = await nachrichtSenden(gate.db, {
    kontakt,
    text: input.text,
    auftragId: input.auftragId ?? null,
    einsatzId,
    userId: gate.user.id,
  })
  return r.ok ? { ok: true } : r
}

/** Im Auftrag an einen Partner geschrieben → sein Einsatz in diesem Auftrag. */
async function einsatzImAuftrag(
  db: SupabaseClient,
  kontakt: WaKontakt,
  auftragId?: string | null,
  einsatzId?: string | null
): Promise<string | null> {
  if (einsatzId) return einsatzId
  if (!auftragId || kontakt.typ !== 'handwerker') return null
  const { data } = await db
    .from('einsaetze')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', kontakt.id)
    .order('gesendet_at', { ascending: false })
    .limit(1)
  return data?.[0]?.id ? String(data[0].id) : null
}

/* ── Auswahl: mehrere Nachrichten → Auftrag/Einsatz → Aktion (nur Partner-Chats) ─────── */

type WaRoh = {
  id: string
  created_at: string
  richtung: string
  art: string
  text: string | null
  handwerker_id: string | null
  media_pfad: string | null
  media_url: string | null
  media_name: string | null
  media_mime: string | null
}

async function nachrichtenLaden(db: SupabaseClient, ids: string[]): Promise<WaRoh[]> {
  if (!ids.length) return []
  const { data, error } = await db
    .from('whatsapp_nachrichten')
    .select('id, created_at, richtung, art, text, handwerker_id, media_pfad, media_url, media_name, media_mime')
    .in('id', ids)
    .order('created_at', { ascending: true })
  if (error) logDbError('app/whatsapp/actions:nachrichten', error)
  return (data ?? []) as WaRoh[]
}

/** Texte der Auswahl in zeitlicher Reihenfolge (ohne Knopf-Antworten). */
function auswahlText(rows: WaRoh[]): string {
  return rows
    .filter((r) => r.art !== 'antwort' && r.text?.trim())
    .map((r) => r.text!.trim())
    .join('\n\n')
}

/** Datei einer Nachricht laden (eigener Bucket oder Link). Testdateien (/mock/…) → null, Link bleibt. */
async function medienDaten(db: SupabaseClient, r: WaRoh): Promise<{ buf: Buffer; mime: string } | null> {
  const mime = r.media_mime || 'application/octet-stream'
  if (r.media_pfad) {
    const { data, error } = await db.storage.from(WHATSAPP_MEDIEN_BUCKET).download(r.media_pfad)
    if (error || !data) return null
    return { buf: Buffer.from(await data.arrayBuffer()), mime }
  }
  if (r.media_url && /^https?:\/\//.test(r.media_url)) {
    const res = await fetch(r.media_url, { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) return null
    return { buf: Buffer.from(await res.arrayBuffer()), mime }
  }
  return null
}

function dateiEndung(r: WaRoh): string {
  const vonName = r.media_name?.split('.').pop()?.toLowerCase()
  if (vonName && vonName.length <= 5) return vonName.replace(/[^a-z0-9]/g, '') || 'bin'
  const m = (r.media_mime ?? '').split(';')[0] ?? ''
  return m === 'application/pdf' ? 'pdf' : m.split('/')[1]?.split('+')[0] || 'bin'
}

/**
 * Medien in einen Ziel-Bucket kopieren. Liefert je Datei den Verweis, den das Ziel erwartet:
 * öffentliche URL (publik) oder Speicherpfad; Testdateien behalten ihren Link.
 */
async function medienKopieren(
  db: SupabaseClient,
  rows: WaRoh[],
  ziel: { bucket: string; ordner: string; publik: boolean }
): Promise<{ name: string; verweis: string; mime: string | null }[]> {
  const out: { name: string; verweis: string; mime: string | null }[] = []
  for (const r of rows) {
    if (!r.media_pfad && !r.media_url) continue
    const daten = await medienDaten(db, r)
    if (!daten) {
      if (r.media_url) out.push({ name: r.media_name || 'WhatsApp', verweis: r.media_url, mime: r.media_mime })
      continue
    }
    const pfad = `${ziel.ordner}/${crypto.randomUUID()}.${dateiEndung(r)}`
    const { error } = await db.storage.from(ziel.bucket).upload(pfad, daten.buf, { contentType: daten.mime, upsert: false })
    if (error) {
      logDbError('app/whatsapp/actions:kopieren', error)
      continue
    }
    out.push({
      name: r.media_name || 'WhatsApp',
      verweis: ziel.publik ? db.storage.from(ziel.bucket).getPublicUrl(pfad).data.publicUrl : pfad,
      mime: r.media_mime,
    })
  }
  return out
}

async function auswahlAbschliessen(
  db: SupabaseClient,
  ids: string[],
  markierung: 'update' | 'tagebuch' | 'dokument' | 'fertig',
  ziel: { auftragId: string; einsatzId?: string | null }
): Promise<void> {
  const { error } = await db
    .from('whatsapp_nachrichten')
    .update({ markierung, auftrag_id: ziel.auftragId, einsatz_id: ziel.einsatzId ?? null })
    .in('id', ids)
  if (error) logDbError('app/whatsapp/actions:abschliessen', error)
  revalidatePath(`/auftraege/${ziel.auftragId}`)
}

export type WaAuswahlKontext = {
  text: string
  medien: { id: string; name: string; mime: string | null; url: string }[]
}

/** Vorausfüllen: Texte und Dateien der ausgewählten Nachrichten. */
export async function whatsAppAuswahlKontext(ids: string[]): Promise<({ ok: true } & WaAuswahlKontext) | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const rows = await nachrichtenLaden(gate.db, ids)
  const medien = await mapNachrichten(gate.db, rows as unknown as Record<string, unknown>[])
  return {
    ok: true,
    text: auswahlText(rows),
    medien: medien
      .filter((m) => m.medium)
      .map((m) => ({ id: m.id, name: m.medium!.name, mime: m.medium!.mime, url: m.medium!.url })),
  }
}

/** Tagebuch: Fotos/PDFs ins Tagebuch-Fach des Auftrags kopieren (öffentliche Links wie beim Upload). */
export async function whatsAppFotosFuerTagebuch(
  ids: string[],
  auftragId: string
): Promise<{ ok: true; fotoUrls: string[] } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const rows = (await nachrichtenLaden(gate.db, ids)).filter(
    (r) => r.media_mime?.startsWith('image/') || r.media_mime === 'application/pdf'
  )
  const kopien = await medienKopieren(gate.db, rows, { bucket: 'protokolle', ordner: `${auftragId}/timeline`, publik: true })
  return { ok: true, fotoUrls: kopien.map((k) => k.verweis) }
}

/** Nach dem Speichern des Tagebuch-Eintrags: Nachrichten zuordnen und markieren. */
export async function whatsAppAlsTagebuchMarkieren(ids: string[], auftragId: string): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  await auswahlAbschliessen(gate.db, ids, 'tagebuch', { auftragId })
  return { ok: true }
}

async function einsatzLaden(db: SupabaseClient, einsatzId: string) {
  const { data } = await db.from('einsaetze').select('id, auftrag_id, handwerker_id, status').eq('id', einsatzId).maybeSingle()
  return data as { id: string; auftrag_id: string; handwerker_id: string; status: string } | null
}

/** Update im Einsatz anlegen — Text und ausgewählte Dateien wie ein Partner-Update. */
export async function whatsAppUpdateErstellen(input: {
  ids: string[]
  einsatzId: string
  text: string
  medienIds: string[]
}): Promise<{ ok: true; auftragId: string } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const e = await einsatzLaden(gate.db, input.einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'angenommen' && e.status !== 'fertig') {
    return { ok: false, message: 'Updates sind möglich, sobald der Einsatz angenommen ist.' }
  }
  const text = input.text.trim()
  const medien = await nachrichtenLaden(gate.db, input.medienIds)
  if (!text && !medien.length) return { ok: false, message: 'Bitte einen Text oder eine Datei auswählen.' }
  const kopien = await medienKopieren(gate.db, medien, {
    bucket: 'handwerker-uploads',
    ordner: `${e.handwerker_id}/einsatz/${e.id}/mitteilung`,
    publik: false,
  })
  const { error } = await gate.db.from('einsatz_mitteilungen').insert({
    einsatz_id: e.id,
    auftrag_id: e.auftrag_id,
    handwerker_id: e.handwerker_id,
    typ: 'update',
    text: text || 'Fotos per WhatsApp',
    dateien: kopien.map((k) => (k.verweis.startsWith('/') || /^https?:/.test(k.verweis) ? { name: k.name, url: k.verweis } : { name: k.name, path: k.verweis })),
    status: 'erledigt',
    erledigt_at: new Date().toISOString(),
    erfasst_von: 'bw',
  })
  if (error) {
    logDbError('app/whatsapp/actions:update', error)
    return { ok: false, message: 'Update konnte nicht gespeichert werden.' }
  }
  await auswahlAbschliessen(gate.db, input.ids, 'update', { auftragId: e.auftrag_id, einsatzId: e.id })
  return { ok: true, auftragId: e.auftrag_id }
}

/** Einsatz aus Sicht des Partners als erledigt melden (wie „Fertig gemeldet“ im CRM). */
export async function whatsAppEinsatzErledigt(input: {
  ids: string[]
  einsatzId: string
  text: string
  medienIds: string[]
}): Promise<{ ok: true; auftragId: string } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const e = await einsatzLaden(gate.db, input.einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'angenommen') return { ok: false, message: 'Der Einsatz muss angenommen sein, um ihn als erledigt zu melden.' }
  const medien = await nachrichtenLaden(gate.db, input.medienIds)
  const kopien = await medienKopieren(gate.db, medien, {
    bucket: 'handwerker-uploads',
    ordner: `${e.handwerker_id}/einsatz/${e.id}/fertig`,
    publik: false,
  })
  const w = await writeEinsatzStatus(gate.db, {
    einsatzId: e.id,
    von: 'angenommen',
    nach: 'fertig',
    extra: {
      fertig_at: new Date().toISOString(),
      fertig_text: input.text.trim() || null,
      fertig_dateien: kopien.map((k) => (k.verweis.startsWith('/') || /^https?:/.test(k.verweis) ? { name: k.name, url: k.verweis } : { name: k.name, path: k.verweis })),
      fertig_von: 'bw',
    },
  })
  if (!w.ok) return { ok: false, message: w.error }
  await auswahlAbschliessen(gate.db, input.ids, 'fertig', { auftragId: e.auftrag_id, einsatzId: e.id })
  return { ok: true, auftragId: e.auftrag_id }
}

/** Ausgewählte Dateien in die Dokumente des Vorgangs (mit Art). */
export async function whatsAppAlsDokumente(input: {
  ids: string[]
  auftragId: string
  einsatzId?: string | null
  art: DokumentArt
}): Promise<{ ok: true; anzahl: number } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { data: auf } = await gate.db.from('auftraege').select('lead_id').eq('id', input.auftragId).maybeSingle()
  if (!auf?.lead_id) return { ok: false, message: 'Zum Auftrag gibt es keinen Vorgang für Dokumente.' }
  const rows = (await nachrichtenLaden(gate.db, input.ids)).filter((r) => r.media_pfad || r.media_url)
  if (!rows.length) return { ok: false, message: 'In der Auswahl ist keine Datei.' }
  const kopien = await medienKopieren(gate.db, rows, { bucket: 'lead-dokumente', ordner: String(auf.lead_id), publik: true })
  if (kopien.length) {
    const { error } = await gate.db.from('lead_dokumente').insert(
      kopien.map((k) => ({
        lead_id: auf.lead_id,
        name: k.name,
        datei_url: k.verweis,
        erstellt_von: gate.user.id,
        art: DOKUMENT_ARTEN.includes(input.art) ? input.art : 'sonstiges',
      }))
    )
    if (error) {
      logDbError('app/whatsapp/actions:dokumente', error)
      return { ok: false, message: 'Dokumente konnten nicht gespeichert werden.' }
    }
  }
  await auswahlAbschliessen(gate.db, input.ids, 'dokument', { auftragId: input.auftragId, einsatzId: input.einsatzId })
  return { ok: true, anzahl: kopien.length }
}

/** Tagebuch-Eintrag dem Kunden per WhatsApp schicken (nach dem Speichern). */
export async function sendeBautagebuchWhatsApp(input: {
  auftragId: string
  titel: string
  text?: string | null
}): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  return bautagebuchPerWhatsApp(gate.db, { ...input, userId: gate.user.id })
}

const MOCK_MEDIEN: Record<'bild' | 'dokument' | 'audio' | 'video', { url: string; name: string; mime: string }[]> = {
  audio: [{ url: '/mock/whatsapp/sprachnachricht.m4a', name: 'Sprachnachricht.m4a', mime: 'audio/mp4' }],
  video: [{ url: '/mock/whatsapp/baustelle.mp4', name: 'Video.mp4', mime: 'video/mp4' }],
  bild: [
    { url: '/mock/whatsapp/baustelle-bad.svg', name: 'IMG-Bad.jpg', mime: 'image/svg+xml' },
    { url: '/mock/whatsapp/baustelle-wand.svg', name: 'IMG-Wand.jpg', mime: 'image/svg+xml' },
  ],
  dokument: [{ url: '/mock/whatsapp/aufmass.pdf', name: 'Aufmass.pdf', mime: 'application/pdf' }],
}

/** Nur Testmodus: Antwort des Kontakts simulieren (läuft durch denselben Webhook-Weg). */
export async function simuliereWhatsAppAntwort(input: {
  ziel: WaZiel
  text?: string
  knopf?: { id: string; titel: string } | null
  medium?: 'bild' | 'dokument' | 'audio' | 'video' | null
}): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  if (whatsappKonfig().modus !== 'mock') return { ok: false, message: 'Nur im Testmodus.' }
  const kontakt = await kontaktLaden(gate.db, input.ziel)
  if (!kontakt) return { ok: false, message: 'Keine Handynummer hinterlegt.' }
  const liste = input.medium ? MOCK_MEDIEN[input.medium] : null
  const m = liste ? liste[Math.floor(Math.random() * liste.length)]! : null
  const payload = mockWebhookPayload({
    von: kontakt.nummer,
    name: kontakt.name,
    text: input.text ?? null,
    knopf: input.knopf ?? null,
    medium: m,
  })
  await webhookVerarbeiten(gate.db, payload, { mock: true })
  return { ok: true }
}

/** Einstellungen: Anzahl Testnachrichten. */
export async function zaehleWhatsAppTestdaten(): Promise<number> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return 0
  const { count } = await gate.db
    .from('whatsapp_nachrichten')
    .select('id', { count: 'exact', head: true })
    .eq('ist_mock', true)
  return count ?? 0
}

/** Vor dem Echtbetrieb: alle Testnachrichten löschen (echte Nachrichten bleiben). */
export async function loescheWhatsAppTestdaten(): Promise<{ ok: true; geloescht: number } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { data, error } = await gate.db.from('whatsapp_nachrichten').delete().eq('ist_mock', true).select('id')
  if (error) {
    logDbError('app/whatsapp/actions:testdaten', error)
    return { ok: false, message: 'Testdaten konnten nicht gelöscht werden.' }
  }
  return { ok: true, geloescht: data?.length ?? 0 }
}

/** WhatsApp-Arten nach Dateityp (Bilder nur JPG/PNG — sonst als Dokument, wie WhatsApp es verlangt). */
function medienArt(mime: string): 'bild' | 'dokument' | 'audio' | 'video' {
  if (mime === 'image/jpeg' || mime === 'image/png') return 'bild'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'dokument'
}

/**
 * Anhang senden: Datei liegt schon im Bucket whatsapp-medien (der Browser lädt direkt hoch,
 * Netlify nimmt keine großen Anfragen an). WhatsApp bekommt einen befristeten Link.
 */
export async function sendeWhatsAppAnhang(input: {
  ziel: WaZiel
  pfad: string
  name: string
  mime: string
  text?: string
  auftragId?: string | null
  einsatzId?: string | null
}): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  if (!input.pfad.startsWith('crm/')) return { ok: false, message: 'Ungültiger Anhang.' }
  const kontakt = await kontaktLaden(gate.db, input.ziel)
  if (!kontakt) return { ok: false, message: 'Keine Handynummer hinterlegt.' }
  const { data: link } = await gate.db.storage.from(WHATSAPP_MEDIEN_BUCKET).createSignedUrl(input.pfad, 60 * 60 * 24)
  if (!link?.signedUrl) return { ok: false, message: 'Anhang nicht gefunden.' }
  const r = await nachrichtSenden(gate.db, {
    kontakt,
    text: input.text,
    medium: { url: link.signedUrl, art: medienArt(input.mime), name: input.name, pfad: input.pfad, mime: input.mime },
    auftragId: input.auftragId ?? null,
    einsatzId: await einsatzImAuftrag(gate.db, kontakt, input.auftragId, input.einsatzId),
    userId: gate.user.id,
  })
  return r.ok ? { ok: true } : r
}

/* ── Postfach „Nachrichten“ ─────────────────────────────────────────────── */

export type WaGespraech = {
  /** Schlüssel für die URL: h:<id> · k:<id> · t:<nummer> */
  schluessel: string
  ziel: WaZiel
  typ: 'handwerker' | 'kunde' | 'unbekannt'
  name: string
  letzte: { text: string; at: string; richtung: 'ein' | 'aus'; status: string }
  ungelesen: number
  /** Eingehende ohne Auftrag und ohne Markierung */
  offen: number
}

/** Alle Chats, neueste zuerst (eine Zeile je Kontakt). */
export async function ladeWhatsAppPostfach(): Promise<{ ok: true; gespraeche: WaGespraech[] } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { data, error } = await gate.db
    .from('whatsapp_nachrichten')
    .select('id, created_at, richtung, art, text, media_name, status, handwerker_id, kunde_id, telefon, auftrag_id, markierung, gelesen_at, handwerker(name, firma), kunden(name)')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) {
    logDbError('app/whatsapp/actions:postfach', error)
    return { ok: false, message: 'Nachrichten konnten nicht geladen werden.' }
  }
  const map = new Map<string, WaGespraech>()
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const ziel: WaZiel = r.handwerker_id
      ? { handwerkerId: String(r.handwerker_id) }
      : r.kunde_id
        ? { kundeId: String(r.kunde_id) }
        : { telefon: String(r.telefon ?? '') }
    const key = gespraechSchluessel(ziel)
    let g = map.get(key)
    if (!g) {
      const hw = one(r.handwerker as { name?: string | null; firma?: string | null } | null)
      const kd = one(r.kunden as { name?: string | null } | null)
      g = {
        schluessel: key,
        ziel,
        typ: r.handwerker_id ? 'handwerker' : r.kunde_id ? 'kunde' : 'unbekannt',
        name: hw?.firma?.trim() || hw?.name?.trim() || kd?.name?.trim() || `+${String(r.telefon ?? '')}`,
        letzte: {
          text: vorschau(r),
          at: String(r.created_at),
          richtung: r.richtung === 'aus' ? 'aus' : 'ein',
          status: String(r.status ?? ''),
        },
        ungelesen: 0,
        offen: 0,
      }
      map.set(key, g)
    }
    if (r.richtung === 'ein' && !r.gelesen_at) g.ungelesen += 1
    if (r.richtung === 'ein' && !r.auftrag_id && !r.markierung) g.offen += 1
  }
  return { ok: true, gespraeche: [...map.values()] }
}

/** Menü-Zähler: ungelesene eingehende Nachrichten. */
export async function zaehleUngeleseneWhatsApp(): Promise<number> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return 0
  const { count } = await gate.db
    .from('whatsapp_nachrichten')
    .select('id', { count: 'exact', head: true })
    .eq('richtung', 'ein')
    .is('gelesen_at', null)
  return count ?? 0
}

export type WaKontaktTreffer = { ziel: WaZiel; typ: 'handwerker' | 'kunde'; name: string; sub: string }

/** „Neuer Chat“: Kunden und Partner mit Handynummer. */
export async function sucheWhatsAppKontakte(q: string): Promise<{ ok: true; treffer: WaKontaktTreffer[] } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const such = q.trim().replace(/[%,()]/g, ' ')
  if (such.length < 2) return { ok: true, treffer: [] }
  const [hw, kd] = await Promise.all([
    gate.db
      .from('handwerker')
      .select('id, name, firma, telefon, whatsapp')
      .or(`name.ilike.%${such}%,firma.ilike.%${such}%`)
      .limit(10),
    gate.db.from('kunden').select('id, name, telefon, org_telefon').ilike('name', `%${such}%`).limit(10),
  ])
  const treffer: WaKontaktTreffer[] = []
  for (const h of hw.data ?? []) {
    const nr = h.whatsapp || h.telefon
    if (!nr) continue
    treffer.push({ ziel: { handwerkerId: String(h.id) }, typ: 'handwerker', name: h.firma?.trim() || h.name?.trim() || 'Partner', sub: `Partner · ${nr}` })
  }
  for (const k of kd.data ?? []) {
    const nr = k.telefon || k.org_telefon
    if (!nr) continue
    treffer.push({ ziel: { kundeId: String(k.id) }, typ: 'kunde', name: String(k.name ?? 'Kunde'), sub: `Kunde · ${nr}` })
  }
  return { ok: true, treffer }
}

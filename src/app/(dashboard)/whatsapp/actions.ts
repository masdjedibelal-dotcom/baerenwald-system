'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
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
import { whatsappProvider } from '@/lib/whatsapp/provider'
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
  markierung: 'update' | 'regie' | 'erledigt' | null
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
  modus: 'mock' | '360dialog'
}

export type WaStatusInfo = { sichtbar: boolean; modus: 'mock' | '360dialog'; nummer: string | null }

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
        markierung: mark === 'update' || mark === 'regie' || mark === 'erledigt' ? mark : null,
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
      const p = whatsappProvider()
      const letzte = ungelesen[ungelesen.length - 1] as { wa_id?: string } | undefined
      if (letzte?.wa_id) await p.alsGelesen(letzte.wa_id)
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

async function nachrichtLaden(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from('whatsapp_nachrichten')
    .select('id, richtung, art, text, handwerker_id, auftrag_id, einsatz_id, media_pfad, media_url, media_name, media_mime')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('app/whatsapp/actions:nachricht', error)
  return data
}

export async function whatsAppZuordnen(
  id: string,
  ziel: { auftragId: string | null; einsatzId?: string | null }
): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { error } = await gate.db
    .from('whatsapp_nachrichten')
    .update({ auftrag_id: ziel.auftragId, einsatz_id: ziel.einsatzId ?? null })
    .eq('id', id)
  if (error) {
    logDbError('app/whatsapp/actions:zuordnen', error)
    return { ok: false, message: 'Zuordnung konnte nicht gespeichert werden.' }
  }
  return { ok: true }
}

export async function whatsAppMarkieren(
  id: string,
  markierung: 'erledigt' | null
): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { error } = await gate.db.from('whatsapp_nachrichten').update({ markierung }).eq('id', id)
  if (error) {
    logDbError('app/whatsapp/actions:markieren', error)
    return { ok: false, message: 'Konnte nicht gespeichert werden.' }
  }
  return { ok: true }
}

/** Nachricht ins Einsatz-Verlauf übernehmen: als Update (Text/Foto) oder Regie (mit Stunden). */
export async function whatsAppUebernehmen(input: {
  id: string
  als: 'update' | 'regie'
  stunden?: number
  stundensatz?: number | null
  text?: string
}): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const n = await nachrichtLaden(gate.db, input.id)
  if (!n) return { ok: false, message: 'Nachricht nicht gefunden.' }
  if (!n.einsatz_id) return { ok: false, message: 'Bitte die Nachricht zuerst einem Einsatz zuordnen.' }
  const { data: e } = await gate.db
    .from('einsaetze')
    .select('id, auftrag_id, handwerker_id, status')
    .eq('id', n.einsatz_id)
    .maybeSingle()
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  const text = (input.text ?? n.text ?? '').trim()
  const dateien = n.media_url
    ? [{ name: n.media_name || 'WhatsApp', url: n.media_url }]
    : n.media_pfad
      ? [{ name: n.media_name || 'WhatsApp', url: await signiertDauerhaft(gate.db, n.media_pfad) }]
      : []
  const now = new Date().toISOString()
  if (input.als === 'update') {
    if (e.status !== 'angenommen' && e.status !== 'fertig') {
      return { ok: false, message: 'Updates sind möglich, sobald der Einsatz angenommen ist.' }
    }
    const { error } = await gate.db.from('einsatz_mitteilungen').insert({
      einsatz_id: e.id,
      auftrag_id: e.auftrag_id,
      handwerker_id: e.handwerker_id,
      typ: 'update',
      text: text || 'Foto per WhatsApp',
      dateien,
      status: 'erledigt',
      erledigt_at: now,
      erfasst_von: 'bw',
    })
    if (error) {
      logDbError('app/whatsapp/actions:update', error)
      return { ok: false, message: 'Update konnte nicht gespeichert werden.' }
    }
  } else {
    const stunden = Number(input.stunden) || 0
    if (stunden <= 0) return { ok: false, message: 'Bitte die Stunden angeben.' }
    if (!text) return { ok: false, message: 'Bitte beschreiben, was gemacht wurde.' }
    if (e.status !== 'angenommen' && e.status !== 'fertig') {
      return { ok: false, message: 'Regie ist möglich, sobald der Einsatz angenommen ist.' }
    }
    const satz = input.stundensatz && input.stundensatz > 0 ? Math.round(input.stundensatz * 100) / 100 : null
    const { error } = await gate.db.from('einsatz_mitteilungen').insert({
      einsatz_id: e.id,
      auftrag_id: e.auftrag_id,
      handwerker_id: e.handwerker_id,
      typ: 'regie',
      text,
      stunden: Math.round(stunden * 100) / 100,
      stundensatz: satz,
      dateien,
      status: 'uebernommen',
      erledigt_at: now,
      erfasst_von: 'bw',
    })
    if (error) {
      logDbError('app/whatsapp/actions:regie', error)
      return { ok: false, message: 'Regie konnte nicht gespeichert werden.' }
    }
  }
  await gate.db.from('whatsapp_nachrichten').update({ markierung: input.als }).eq('id', input.id)
  revalidatePath(`/auftraege/${String(e.auftrag_id)}`)
  return { ok: true }
}

/** Langer Link (1 Jahr) für Medien, die ins Einsatz-Verlauf übernommen werden. */
async function signiertDauerhaft(db: SupabaseClient, pfad: string): Promise<string> {
  const { data } = await db.storage.from(WHATSAPP_MEDIEN_BUCKET).createSignedUrl(pfad, 60 * 60 * 24 * 365)
  return data?.signedUrl ?? ''
}

/** Foto/PDF aus WhatsApp in die Dokumente des Vorgangs (mit Art). */
export async function whatsAppAlsDokument(id: string, art: DokumentArt): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const n = await nachrichtLaden(gate.db, id)
  if (!n) return { ok: false, message: 'Nachricht nicht gefunden.' }
  if (!n.auftrag_id) return { ok: false, message: 'Bitte die Nachricht zuerst einem Auftrag zuordnen.' }
  if (!n.media_pfad && !n.media_url) return { ok: false, message: 'Diese Nachricht hat keine Datei.' }
  const { data: auf } = await gate.db.from('auftraege').select('lead_id').eq('id', n.auftrag_id).maybeSingle()
  if (!auf?.lead_id) return { ok: false, message: 'Zum Auftrag gibt es keinen Vorgang für Dokumente.' }
  let url = String(n.media_url ?? '')
  let groesse: number | null = null
  if (n.media_pfad) {
    // In den Dokumenten-Bucket kopieren, damit der Link dauerhaft gilt
    const { data: blob, error } = await gate.db.storage.from(WHATSAPP_MEDIEN_BUCKET).download(n.media_pfad)
    if (error || !blob) return { ok: false, message: 'Datei konnte nicht geladen werden.' }
    const buf = Buffer.from(await blob.arrayBuffer())
    groesse = buf.length
    const name = (n.media_name || 'WhatsApp').replace(/[^\w.\-äöüÄÖÜß]+/gi, '_')
    const pfad = `${auf.lead_id}/${Date.now()}-whatsapp-${name}`
    const up = await gate.db.storage
      .from('lead-dokumente')
      .upload(pfad, buf, { contentType: n.media_mime || undefined, upsert: false })
    if (up.error) {
      logDbError('app/whatsapp/actions:dokument-upload', up.error)
      return { ok: false, message: 'Datei konnte nicht gespeichert werden.' }
    }
    url = gate.db.storage.from('lead-dokumente').getPublicUrl(pfad).data.publicUrl
  }
  const { error } = await gate.db.from('lead_dokumente').insert({
    lead_id: auf.lead_id,
    name: n.media_name || 'WhatsApp-Datei',
    datei_url: url,
    groesse_bytes: groesse,
    erstellt_von: gate.user.id,
    art: DOKUMENT_ARTEN.includes(art) ? art : 'sonstiges',
  })
  if (error) {
    logDbError('app/whatsapp/actions:dokument', error)
    return { ok: false, message: 'Dokument konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/auftraege/${String(n.auftrag_id)}`)
  return { ok: true }
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
    medium: m && input.medium ? { art: input.medium, name: m.name, mime: m.mime } : null,
  })
  await webhookVerarbeiten(gate.db, payload, { mock: true, mockMedium: m })
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

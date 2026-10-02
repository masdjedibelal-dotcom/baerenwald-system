'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { buildEinsatzPartnerMail } from '@/lib/mail/einsatz-partner-mail'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import {
  markEinsatzUpdatesGesehen,
  writeEinsatzMitteilungStatus,
} from '@/lib/status/write-einsatz-mitteilung-status'
import { planAuftragStatusWrite } from '@/lib/status/write-auftrag-status'
import { writeEinsatzStatus } from '@/lib/status/write-einsatz-status'

/** Bucket der Partner-Uploads (Portal `PARTNER_UPLOAD_BUCKET`). */
const PARTNER_UPLOAD_BUCKET = 'handwerker-uploads'

/**
 * Einsätze (Umbau P11): Anweisung + EK an genau einen Partner je Einsatz.
 * Ersetzt die Zuweisung von Auftragspositionen an Partner.
 */

export type EinsatzStatus = 'gesendet' | 'angenommen' | 'abgelehnt' | 'fertig'

export type EinsatzZeile = {
  id: string
  auftrag_id: string
  handwerker_id: string
  partner_name: string
  titel: string
  anweisung: string | null
  termin_von: string | null
  termin_bis: string | null
  ort: string | null
  kontakt_vor_ort: string | null
  ek_betrag: number | null
  ek_art: 'netto' | 'brutto'
  status: EinsatzStatus
  gesendet_at: string
  angenommen_at: string | null
  /** Wer welchen Schritt erfasst hat: Partner (null/'partner') oder Bärenwald ('bw'). */
  angenommen_von: 'partner' | 'bw' | null
  fertig_von: 'partner' | 'bw' | null
  rechnung_von: 'partner' | 'bw' | null
  ablehnung_grund: string | null
  fertig_at: string | null
  fertig_text: string | null
  fertig_dateien: { name: string; url: string }[]
  rechnung_pdf_url: string | null
  rechnung_betrag: number | null
  rechnung_eingereicht_at: string | null
  mitteilungen: EinsatzMitteilung[]
}

/**
 * Meldung des Partners am Einsatz: Update (Text, Fotos) oder Regie (Stunden, Text).
 * Nur intern, der Kunde sieht das nie (Kunde: Bautagebuch).
 * „offen“ heißt: Update ungelesen bzw. Regie noch nicht entschieden.
 * „behinderung“ nur noch in Altdaten, wird wie ein Update gezeigt.
 */
export type EinsatzMitteilung = {
  id: string
  typ: 'update' | 'regie' | 'behinderung'
  text: string
  stunden: number | null
  status: 'offen' | 'uebernommen' | 'erledigt'
  dateien: { name: string; url: string }[]
  created_at: string
  erfasst_von: 'partner' | 'bw' | null
}

export type EinsatzPartnerOption = { id: string; label: string; email: string | null }

export type EinsatzVorbelegung = {
  titel: string
  termin_von: string | null
  termin_bis: string | null
  ort: string
  kontakt_vor_ort: string
}

const SELECT =
  'id, auftrag_id, handwerker_id, titel, anweisung, termin_von, termin_bis, ort, kontakt_vor_ort, ek_betrag, ek_art, status, gesendet_at, angenommen_at, angenommen_von, fertig_von, rechnung_von, ablehnung_grund, fertig_at, fertig_text, fertig_dateien, rechnung_pdf_url, rechnung_betrag, rechnung_eingereicht_at, handwerker(name, firma)'

function partnerLabel(hw: { name?: string | null; firma?: string | null } | null | undefined): string {
  return hw?.firma?.trim() || hw?.name?.trim() || 'Partner'
}

function mapZeile(r: Record<string, unknown>): EinsatzZeile {
  const hwRaw = r.handwerker as
    | { name?: string | null; firma?: string | null }
    | { name?: string | null; firma?: string | null }[]
    | null
  const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  return {
    id: String(r.id),
    auftrag_id: String(r.auftrag_id),
    handwerker_id: String(r.handwerker_id),
    partner_name: partnerLabel(hw),
    titel: String(r.titel ?? ''),
    anweisung: (r.anweisung as string | null) ?? null,
    termin_von: (r.termin_von as string | null) ?? null,
    termin_bis: (r.termin_bis as string | null) ?? null,
    ort: (r.ort as string | null) ?? null,
    kontakt_vor_ort: (r.kontakt_vor_ort as string | null) ?? null,
    ek_betrag: r.ek_betrag == null ? null : Number(r.ek_betrag),
    ek_art: r.ek_art === 'brutto' ? 'brutto' : 'netto',
    status: (String(r.status ?? 'gesendet') as EinsatzStatus) ?? 'gesendet',
    gesendet_at: String(r.gesendet_at ?? ''),
    angenommen_at: (r.angenommen_at as string | null) ?? null,
    angenommen_von: r.angenommen_von === 'bw' ? 'bw' : r.angenommen_von === 'partner' ? 'partner' : null,
    fertig_von: r.fertig_von === 'bw' ? 'bw' : r.fertig_von === 'partner' ? 'partner' : null,
    rechnung_von: r.rechnung_von === 'bw' ? 'bw' : r.rechnung_von === 'partner' ? 'partner' : null,
    ablehnung_grund: (r.ablehnung_grund as string | null) ?? null,
    fertig_at: (r.fertig_at as string | null) ?? null,
    fertig_text: (r.fertig_text as string | null) ?? null,
    fertig_dateien: Array.isArray(r.fertig_dateien)
      ? (r.fertig_dateien as { name: string; url: string }[])
      : [],
    rechnung_pdf_url: (r.rechnung_pdf_url as string | null) ?? null,
    rechnung_betrag: r.rechnung_betrag == null ? null : Number(r.rechnung_betrag),
    rechnung_eingereicht_at: (r.rechnung_eingereicht_at as string | null) ?? null,
    mitteilungen: [],
  }
}

export async function listEinsaetze(
  auftragId: string
): Promise<{ ok: true; einsaetze: EinsatzZeile[] } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data, error } = await gate.db
    .from('einsaetze')
    .select(SELECT)
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: true })
  if (error) {
    logDbError('app/auftraege/einsatz-actions:list', error)
    return { ok: false, message: 'Einsätze konnten nicht geladen werden.' }
  }
  const einsaetze = (data ?? []).map((r) => mapZeile(r as Record<string, unknown>))
  // Partner-Uploads liegen als Pfad im privaten Bucket → befristete Links fürs CRM.
  const bucket = gate.db.storage.from(PARTNER_UPLOAD_BUCKET)
  const signiert = async (pfad: string | null | undefined): Promise<string | null> => {
    const p = String(pfad ?? '').trim()
    if (!p) return null
    if (/^https?:\/\//.test(p)) return p
    const { data: s } = await bucket.createSignedUrl(p, 60 * 60)
    return s?.signedUrl ?? null
  }
  const signiereDateien = async (liste: unknown): Promise<{ name: string; url: string }[]> =>
    (
      await Promise.all(
        (Array.isArray(liste) ? liste : []).map(async (d) => {
          const raw = d as { name?: string; url?: string; path?: string }
          const url = await signiert(raw.url ?? raw.path)
          return url ? { name: raw.name || 'Datei', url } : null
        })
      )
    ).filter((x): x is { name: string; url: string } => Boolean(x))
  for (const e of einsaetze) {
    e.fertig_dateien = await signiereDateien(e.fertig_dateien)
    e.rechnung_pdf_url = await signiert(e.rechnung_pdf_url)
  }
  if (einsaetze.length) {
    const { data: mitt, error: mErr } = await gate.db
      .from('einsatz_mitteilungen')
      .select('id, einsatz_id, typ, text, stunden, status, dateien, created_at, erfasst_von')
      .eq('auftrag_id', auftragId)
      .order('created_at', { ascending: true })
    if (mErr) logDbError('app/auftraege/einsatz-actions:mitteilungen', mErr)
    for (const m of mitt ?? []) {
      const ziel = einsaetze.find((e) => e.id === String(m.einsatz_id))
      if (!ziel) continue
      ziel.mitteilungen.push({
        id: String(m.id),
        typ: m.typ === 'behinderung' || m.typ === 'regie' ? m.typ : 'update',
        text: String(m.text ?? ''),
        stunden: m.stunden == null ? null : Number(m.stunden),
        status: (String(m.status) as EinsatzMitteilung['status']) || 'offen',
        dateien: await signiereDateien(m.dateien),
        created_at: String(m.created_at ?? ''),
        erfasst_von: m.erfasst_von === 'bw' ? 'bw' : null,
      })
    }
  }
  return { ok: true, einsaetze }
}

/**
 * Regie-Meldung des Partners bestätigen oder ablehnen (nur Rückmeldung an den Partner).
 * Es entsteht keine Position: den Auftrag bearbeitet Bärenwald danach selbst und sendet ihn neu.
 * In der Datenbank: angenommen = „uebernommen“, abgelehnt = „erledigt“.
 */
export async function regieEntscheiden(
  mitteilungId: string,
  entscheidung: 'angenommen' | 'abgelehnt'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data: m, error } = await writeEinsatzMitteilungStatus(
    gate.db,
    mitteilungId,
    entscheidung === 'angenommen' ? 'uebernommen' : 'erledigt'
  )
  if (error) {
    logDbError('app/auftraege/einsatz-actions:regie-entscheiden', error)
    return { ok: false, message: 'Konnte nicht gespeichert werden.' }
  }
  if (!m?.length) return { ok: false, message: 'Diese Regie ist bereits entschieden.' }
  revalidatePath(`/auftraege/${String(m[0].auftrag_id)}`)
  return { ok: true }
}

/** Einsatz geöffnet: neue Partner-Updates gelten als gelesen. */
export async function einsatzUpdatesGesehen(
  einsatzId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { error } = await markEinsatzUpdatesGesehen(gate.db, einsatzId)
  if (error) {
    logDbError('app/auftraege/einsatz-actions:updates-gesehen', error)
    return { ok: false, message: 'Konnte nicht gespeichert werden.' }
  }
  return { ok: true }
}

/** Partner-Auswahl und Vorbelegung (Ort, Kontakt, Termin) für „Einsatz anlegen“. */
export async function loadEinsatzFormular(auftragId: string): Promise<
  | { ok: true; partner: EinsatzPartnerOption[]; vorbelegung: EinsatzVorbelegung }
  | { ok: false; message: string }
> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const [hwRes, aufRes] = await Promise.all([
    gate.db.from('handwerker').select('id, name, firma, email, aktiv').order('firma', { ascending: true }),
    gate.db
      .from('auftraege')
      .select('titel, start_datum, end_datum, leads(strasse, hausnummer, plz, kontakt_name, kontakt_telefon)')
      .eq('id', auftragId)
      .maybeSingle(),
  ])
  if (hwRes.error) logDbError('app/auftraege/einsatz-actions:handwerker', hwRes.error)
  if (aufRes.error) logDbError('app/auftraege/einsatz-actions:auftrag', aufRes.error)
  if (!aufRes.data) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const partner = (hwRes.data ?? [])
    .filter((h) => (h as { aktiv?: boolean | null }).aktiv !== false)
    .map((h) => ({
      id: String(h.id),
      label: partnerLabel(h as { name?: string | null; firma?: string | null }),
      email: ((h as { email?: string | null }).email ?? '').trim() || null,
    }))
  const leadRaw = (aufRes.data as { leads?: unknown }).leads
  const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as
    | { strasse?: string | null; hausnummer?: string | null; plz?: string | null; kontakt_name?: string | null; kontakt_telefon?: string | null }
    | null
  const ort = [
    [lead?.strasse, lead?.hausnummer].filter(Boolean).join(' '),
    lead?.plz ?? '',
  ]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(', ')
  const kontakt = [lead?.kontakt_name, lead?.kontakt_telefon]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(', ')
  const a = aufRes.data as { titel?: string | null; start_datum?: string | null; end_datum?: string | null }
  return {
    ok: true,
    partner,
    vorbelegung: {
      titel: String(a.titel ?? '').trim(),
      termin_von: a.start_datum ? String(a.start_datum).slice(0, 10) : null,
      termin_bis: a.end_datum ? String(a.end_datum).slice(0, 10) : null,
      ort,
      kontakt_vor_ort: kontakt,
    },
  }
}

export async function createEinsatz(input: {
  auftragId: string
  handwerkerId: string
  titel: string
  anweisung?: string | null
  terminVon?: string | null
  terminBis?: string | null
  ort?: string | null
  kontaktVorOrt?: string | null
  ekBetrag?: number | null
  ekArt: 'netto' | 'brutto'
  /** Telefonisch vergeben: keine Mail, Einsatz gilt als angenommen (von Bärenwald eingetragen). */
  ohneMail?: boolean
}): Promise<{ ok: true; einsatz: EinsatzZeile; mailGesendet: boolean } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const titel = input.titel.trim()
  if (!input.handwerkerId) return { ok: false, message: 'Bitte einen Partner wählen.' }
  if (!titel) return { ok: false, message: 'Bitte einen Titel angeben.' }

  const { data, error } = await gate.db
    .from('einsaetze')
    .insert({
      auftrag_id: input.auftragId,
      handwerker_id: input.handwerkerId,
      titel,
      anweisung: input.anweisung?.trim() || null,
      termin_von: input.terminVon || null,
      termin_bis: input.terminBis || null,
      ort: input.ort?.trim() || null,
      kontakt_vor_ort: input.kontaktVorOrt?.trim() || null,
      ek_betrag: input.ekBetrag != null && input.ekBetrag > 0 ? Math.round(input.ekBetrag * 100) / 100 : null,
      ek_art: input.ekArt === 'brutto' ? 'brutto' : 'netto',
      status: input.ohneMail ? 'angenommen' : 'gesendet',
      ...(input.ohneMail ? { angenommen_at: new Date().toISOString(), angenommen_von: 'bw' } : {}),
      erstellt_von: gate.user.id,
    })
    .select(SELECT)
    .single()
  if (error || !data) {
    logDbError('app/auftraege/einsatz-actions:insert', error)
    return { ok: false, message: 'Einsatz konnte nicht angelegt werden.' }
  }
  const einsatz = mapZeile(data as Record<string, unknown>)

  if (input.ohneMail) {
    // Wie „Partner hat angenommen“: Auftrag läuft
    await gate.db
      .from('auftraege')
      .update(planAuftragStatusWrite('in_arbeit'))
      .eq('id', input.auftragId)
      .eq('status', 'offen')
    revalidatePath(`/auftraege/${input.auftragId}`)
    return { ok: true, einsatz, mailGesendet: false }
  }

  // Mail an den Partner — Einsatz ist angelegt, auch wenn die Mail scheitert (Hinweis im CRM).
  let mailGesendet = false
  const { data: hw } = await gate.db
    .from('handwerker')
    .select('email, name, firma')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  const email = String((hw as { email?: string | null } | null)?.email ?? '').trim()
  if (email) {
    const branding = await getMailBranding()
    const tpl = buildEinsatzPartnerMail(
      {
        partnerName: partnerLabel(hw as { name?: string | null; firma?: string | null }),
        titel: einsatz.titel,
        anweisung: einsatz.anweisung,
        terminVon: einsatz.termin_von,
        terminBis: einsatz.termin_bis,
        ort: einsatz.ort,
        kontaktVorOrt: einsatz.kontakt_vor_ort,
        ekBetrag: einsatz.ek_betrag,
        ekArt: einsatz.ek_art,
        portalLink: buildPartnerDashboardLink(),
      },
      branding
    )
    const sent = await sendMail({
      typ: 'einsatz_partner',
      an: email,
      anName: einsatz.partner_name,
      betreff: tpl.betreff,
      html: tpl.html,
      auftragId: input.auftragId,
      kontextTyp: 'auftrag',
    })
    mailGesendet = sent.success
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, einsatz, mailGesendet }
}

/** Nur solange der Partner noch nicht angenommen hat (gesendet/abgelehnt). */
export async function zurueckziehenEinsatz(
  einsatzId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data: row, error } = await gate.db
    .from('einsaetze')
    .select('id, auftrag_id, status')
    .eq('id', einsatzId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/einsatz-actions:load', error)
  if (!row) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (row.status !== 'gesendet' && row.status !== 'abgelehnt') {
    return { ok: false, message: 'Angenommene Einsätze können nicht zurückgezogen werden.' }
  }
  const { error: delErr } = await gate.db.from('einsaetze').delete().eq('id', einsatzId)
  if (delErr) {
    logDbError('app/auftraege/einsatz-actions:delete', delErr)
    return { ok: false, message: 'Einsatz konnte nicht zurückgezogen werden.' }
  }
  revalidatePath(`/auftraege/${String(row.auftrag_id)}`)
  return { ok: true }
}

/* ── Für den Partner eintragen (nach Telefon/WhatsApp) ──────────────────────────
 * Schreibt dasselbe wie das Partner-Portal, markiert aber „von Bärenwald“ (…_von = 'bw').
 */

type ErfassenResult = { ok: true } | { ok: false; message: string }

async function ladeEinsatzKurz(db: SupabaseClient, einsatzId: string) {
  const { data, error } = await db
    .from('einsaetze')
    .select('id, auftrag_id, handwerker_id, status, rechnung_eingereicht_at')
    .eq('id', einsatzId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/einsatz-actions:kurz', error)
  return data as
    | { id: string; auftrag_id: string; handwerker_id: string; status: string; rechnung_eingereicht_at: string | null }
    | null
}

/** Dateien wie im Partner-Portal ablegen (gleicher Bucket/Pfad), damit beide Seiten sie gleich zeigen. */
async function ladeDateienHoch(
  db: SupabaseClient,
  handwerkerId: string,
  einsatzId: string,
  files: File[],
  ordner: 'mitteilung' | 'fertig' | 'rechnung'
): Promise<{ ok: true; dateien: { name: string; path: string }[] } | { ok: false; message: string }> {
  const out: { name: string; path: string }[] = []
  for (const file of files) {
    const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    const ext = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1] || 'jpg'
    const path = `${handwerkerId}/einsatz/${einsatzId}/${ordner}/${crypto.randomUUID()}.${ext}`
    const { error } = await db.storage
      .from(PARTNER_UPLOAD_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: mime, upsert: false })
    if (error) {
      logDbError('app/auftraege/einsatz-actions:upload', error)
      return { ok: false, message: 'Datei konnte nicht hochgeladen werden.' }
    }
    out.push({ name: file.name || 'Datei', path })
  }
  return { ok: true, dateien: out }
}

function dateienAus(formData: FormData, feld: string): File[] {
  return formData.getAll(feld).filter((f): f is File => f instanceof File && f.size > 0)
}

function betragAus(formData: FormData): number | null {
  const n = Number(String(formData.get('rechnungBetrag') ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

/** Partner hat zugesagt bzw. abgesagt (z. B. am Telefon). */
export async function einsatzRueckmeldungErfassen(
  einsatzId: string,
  antwort: 'angenommen' | 'abgelehnt',
  grund?: string
): Promise<ErfassenResult> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const e = await ladeEinsatzKurz(gate.db, einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  const now = new Date().toISOString()
  if (antwort === 'abgelehnt' && !grund?.trim()) return { ok: false, message: 'Bitte kurz den Grund angeben.' }
  const w = await writeEinsatzStatus(gate.db, {
    einsatzId,
    von: 'gesendet',
    nach: antwort,
    extra:
      antwort === 'angenommen'
        ? { angenommen_at: now, angenommen_von: 'bw' }
        : { abgelehnt_at: now, ablehnung_grund: grund!.trim() },
  })
  if (!w.ok) return { ok: false, message: w.error }
  revalidatePath(`/auftraege/${e.auftrag_id}`)
  return { ok: true }
}

/** Update des Partners eintragen (Text und/oder Fotos, z. B. aus WhatsApp). */
export async function einsatzUpdateErfassen(formData: FormData): Promise<ErfassenResult> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const einsatzId = String(formData.get('einsatzId') ?? '').trim()
  const text = String(formData.get('text') ?? '').trim()
  const files = dateienAus(formData, 'dateien')
  const e = await ladeEinsatzKurz(gate.db, einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'angenommen') return { ok: false, message: 'Updates sind möglich, solange der Einsatz läuft.' }
  if (!text && !files.length) return { ok: false, message: 'Bitte einen Text oder ein Foto hinzufügen.' }
  const up = await ladeDateienHoch(gate.db, e.handwerker_id, einsatzId, files, 'mitteilung')
  if (!up.ok) return up
  const { error } = await gate.db.from('einsatz_mitteilungen').insert({
    einsatz_id: einsatzId,
    auftrag_id: e.auftrag_id,
    handwerker_id: e.handwerker_id,
    typ: 'update',
    text,
    dateien: up.dateien,
    // Von Bärenwald eingetragen = schon gelesen
    status: 'erledigt',
    erledigt_at: new Date().toISOString(),
    erfasst_von: 'bw',
  })
  if (error) {
    logDbError('app/auftraege/einsatz-actions:update-erfassen', error)
    return { ok: false, message: 'Update konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/auftraege/${e.auftrag_id}`)
  return { ok: true }
}

/** Rechnungsfelder aus Formular (PDF oder Betrag) — gemeinsam für „Fertig“ und „Rechnung nachreichen“. */
async function rechnungPatch(
  db: SupabaseClient,
  e: { id: string; handwerker_id: string },
  formData: FormData
): Promise<{ ok: true; patch: Record<string, unknown> | null } | { ok: false; message: string }> {
  const pdf = dateienAus(formData, 'rechnungPdf')[0]
  const betrag = betragAus(formData)
  if (!pdf && !betrag) return { ok: true, patch: null }
  let pfad: string | null = null
  if (pdf) {
    const up = await ladeDateienHoch(db, e.handwerker_id, e.id, [pdf], 'rechnung')
    if (!up.ok) return up
    pfad = up.dateien[0]?.path ?? null
  }
  return {
    ok: true,
    patch: {
      rechnung_pdf_url: pfad,
      rechnung_betrag: betrag,
      rechnung_positionen: betrag ? [{ text: 'Rechnung', betrag }] : null,
      rechnung_eingereicht_at: new Date().toISOString(),
      rechnung_von: 'bw',
    },
  }
}

/** Partner ist fertig — optional gleich mit Rechnung (PDF oder Betrag). */
export async function einsatzFertigErfassen(formData: FormData): Promise<ErfassenResult> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const einsatzId = String(formData.get('einsatzId') ?? '').trim()
  const text = String(formData.get('text') ?? '').trim() || null
  const e = await ladeEinsatzKurz(gate.db, einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'angenommen') return { ok: false, message: 'Der Einsatz muss zuerst angenommen sein.' }
  const up = await ladeDateienHoch(gate.db, e.handwerker_id, einsatzId, dateienAus(formData, 'dateien'), 'fertig')
  if (!up.ok) return up
  const re = await rechnungPatch(gate.db, e, formData)
  if (!re.ok) return re
  const w = await writeEinsatzStatus(gate.db, {
    einsatzId,
    von: 'angenommen',
    nach: 'fertig',
    extra: {
      fertig_at: new Date().toISOString(),
      fertig_text: text,
      fertig_dateien: up.dateien,
      fertig_von: 'bw',
      ...(re.patch ?? {}),
    },
  })
  if (!w.ok) return { ok: false, message: w.error }
  revalidatePath(`/auftraege/${e.auftrag_id}`)
  return { ok: true }
}

/** Rechnung des Partners nachreichen (PDF oder Betrag). */
export async function einsatzRechnungErfassen(formData: FormData): Promise<ErfassenResult> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const einsatzId = String(formData.get('einsatzId') ?? '').trim()
  const e = await ladeEinsatzKurz(gate.db, einsatzId)
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (e.status !== 'fertig') return { ok: false, message: 'Die Rechnung ist nach der Fertigmeldung möglich.' }
  if (e.rechnung_eingereicht_at) return { ok: false, message: 'Die Rechnung ist bereits erfasst.' }
  const re = await rechnungPatch(gate.db, e, formData)
  if (!re.ok) return re
  if (!re.patch) return { ok: false, message: 'Bitte ein PDF hochladen oder den Betrag angeben.' }
  const { error } = await gate.db
    .from('einsaetze')
    .update({ ...re.patch, updated_at: new Date().toISOString() })
    .eq('id', einsatzId)
  if (error) {
    logDbError('app/auftraege/einsatz-actions:rechnung-erfassen', error)
    return { ok: false, message: 'Rechnung konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/auftraege/${e.auftrag_id}`)
  return { ok: true }
}

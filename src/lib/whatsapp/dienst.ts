import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { logDbError } from '@/lib/errors/log-db-error'
import { formatDatum,formatEuro } from '@/lib/format/geld-datum'
import { writeEinsatzStatus } from '@/lib/status/write-einsatz-status'
import { writeWhatsAppStatus } from '@/lib/status/write-whatsapp-status'
import { whatsappProvider,vorlageAnzeige } from '@/lib/whatsapp/provider'
import { waNummer } from '@/lib/whatsapp/telefon'
import { einsatzKnopfId,parseEinsatzKnopfId,type VorlagenName } from '@/lib/whatsapp/vorlagen'
import { parseWhatsAppWebhook,type WaEingang } from '@/lib/whatsapp/webhook-parse'

/**
 * WhatsApp-Kern: Kontakt zur Nummer finden, eingehende Nachrichten zuordnen und speichern,
 * Antwort-Knöpfe ausführen, Nachrichten senden. Läuft mit Service-Role (Webhook und CRM-Aktionen).
 */

export const WHATSAPP_MEDIEN_BUCKET = 'whatsapp-medien'
/** WhatsApp erlaubt freie Nachrichten nur bis 24 Std. nach der letzten Nachricht des Kontakts. */
const FENSTER_MS = 24 * 60 * 60 * 1000

export type WaKontakt =
  | { typ: 'handwerker'; id: string; name: string; nummer: string }
  | { typ: 'kunde'; id: string; name: string; nummer: string }
  /** Nummer ohne Kunde/Partner im CRM (id = Nummer) */
  | { typ: 'unbekannt'; id: string; name: string; nummer: string }

function partnerName(h: { name?: string | null; firma?: string | null }): string {
  return h.firma?.trim() || h.name?.trim() || 'Partner'
}

/** Partner zuerst (WhatsApp-Feld, dann Telefon), sonst Kunde. */
export async function kontaktZuNummer(db: SupabaseClient, nummer: string): Promise<WaKontakt | null> {
  const nr = waNummer(nummer)
  if (!nr) return null
  const { data: hw, error } = await db.from('handwerker').select('id, name, firma, telefon, whatsapp')
  if (error) logDbError('lib/whatsapp/dienst:handwerker', error)
  for (const h of hw ?? []) {
    if (waNummer(h.whatsapp) === nr || waNummer(h.telefon) === nr) {
      return { typ: 'handwerker', id: String(h.id), name: partnerName(h), nummer: nr }
    }
  }
  const { data: kd, error: kErr } = await db.from('kunden').select('id, name, telefon, org_telefon')
  if (kErr) logDbError('lib/whatsapp/dienst:kunden', kErr)
  for (const k of kd ?? []) {
    if (waNummer(k.telefon) === nr || waNummer(k.org_telefon) === nr) {
      return { typ: 'kunde', id: String(k.id), name: String(k.name ?? 'Kunde'), nummer: nr }
    }
  }
  return null
}

export async function kontaktLaden(
  db: SupabaseClient,
  ziel: { handwerkerId?: string | null; kundeId?: string | null; telefon?: string | null }
): Promise<WaKontakt | null> {
  if (ziel.telefon) {
    const nr = waNummer(ziel.telefon)
    if (!nr) return null
    return (await kontaktZuNummer(db, nr)) ?? { typ: 'unbekannt', id: nr, name: `+${nr}`, nummer: nr }
  }
  if (ziel.handwerkerId) {
    const { data } = await db
      .from('handwerker')
      .select('id, name, firma, telefon, whatsapp')
      .eq('id', ziel.handwerkerId)
      .maybeSingle()
    const nr = data ? waNummer(data.whatsapp) ?? waNummer(data.telefon) : null
    return data && nr ? { typ: 'handwerker', id: String(data.id), name: partnerName(data), nummer: nr } : null
  }
  if (ziel.kundeId) {
    const { data } = await db.from('kunden').select('id, name, telefon, org_telefon').eq('id', ziel.kundeId).maybeSingle()
    const nr = data ? waNummer(data.telefon) ?? waNummer(data.org_telefon) : null
    return data && nr ? { typ: 'kunde', id: String(data.id), name: String(data.name ?? 'Kunde'), nummer: nr } : null
  }
  return null
}

/** Laufende Einsätze eines Partners (gesendet oder angenommen), neueste zuerst. */
export async function aktiveEinsaetze(
  db: SupabaseClient,
  handwerkerId: string
): Promise<{ id: string; auftrag_id: string; titel: string; status: string }[]> {
  const { data, error } = await db
    .from('einsaetze')
    .select('id, auftrag_id, titel, status')
    .eq('handwerker_id', handwerkerId)
    .in('status', ['gesendet', 'angenommen'])
    .order('gesendet_at', { ascending: false })
  if (error) logDbError('lib/whatsapp/dienst:einsaetze', error)
  return (data ?? []).map((e) => ({
    id: String(e.id),
    auftrag_id: String(e.auftrag_id),
    titel: String(e.titel ?? ''),
    status: String(e.status),
  }))
}

/** Laufende Aufträge eines Kunden (offen oder in Arbeit). */
async function aktiveAuftraegeKunde(db: SupabaseClient, kundeId: string): Promise<string[]> {
  const { data, error } = await db
    .from('auftraege')
    .select('id')
    .eq('kunde_id', kundeId)
    .in('status', ['offen', 'in_arbeit'])
  if (error) logDbError('lib/whatsapp/dienst:auftraege', error)
  return (data ?? []).map((a) => String(a.id))
}

/** Hat der Kontakt in den letzten 24 Std. geschrieben? Dann sind freie Nachrichten erlaubt. */
export async function imFenster(db: SupabaseClient, nummer: string): Promise<boolean> {
  const { data } = await db
    .from('whatsapp_nachrichten')
    .select('created_at')
    .eq('telefon', nummer)
    .eq('richtung', 'ein')
    .order('created_at', { ascending: false })
    .limit(1)
  const letzte = data?.[0]?.created_at
  return Boolean(letzte && Date.now() - new Date(String(letzte)).getTime() < FENSTER_MS)
}

type Zuordnung = { auftrag_id: string | null; einsatz_id: string | null }

/**
 * Zuordnung einer eingehenden Nachricht:
 * 1. Knopf eines Einsatzes → dieser Einsatz
 * 2. Antwort auf unsere Nachricht → deren Auftrag/Einsatz
 * 3. Partner mit genau einem laufenden Einsatz / Kunde mit genau einem laufenden Auftrag
 * Sonst offen — Bärenwald ordnet im Chat zu.
 */
async function zuordnen(db: SupabaseClient, kontakt: WaKontakt | null, e: WaEingang): Promise<Zuordnung> {
  const knopf = parseEinsatzKnopfId(e.knopfId)
  if (knopf) {
    const { data } = await db.from('einsaetze').select('id, auftrag_id').eq('id', knopf.einsatzId).maybeSingle()
    if (data) return { auftrag_id: String(data.auftrag_id), einsatz_id: String(data.id) }
  }
  if (e.antwortAufWaId) {
    const { data } = await db
      .from('whatsapp_nachrichten')
      .select('auftrag_id, einsatz_id')
      .eq('wa_id', e.antwortAufWaId)
      .maybeSingle()
    if (data?.auftrag_id) {
      return { auftrag_id: String(data.auftrag_id), einsatz_id: data.einsatz_id ? String(data.einsatz_id) : null }
    }
  }
  if (kontakt?.typ === 'handwerker') {
    const laufend = await aktiveEinsaetze(db, kontakt.id)
    if (laufend.length === 1) return { auftrag_id: laufend[0]!.auftrag_id, einsatz_id: laufend[0]!.id }
  }
  if (kontakt?.typ === 'kunde') {
    const laufend = await aktiveAuftraegeKunde(db, kontakt.id)
    if (laufend.length === 1) return { auftrag_id: laufend[0]!, einsatz_id: null }
  }
  return { auftrag_id: null, einsatz_id: null }
}

async function mediumSpeichern(
  db: SupabaseClient,
  e: WaEingang
): Promise<{ media_pfad: string | null; media_mime: string | null; media_name: string | null }> {
  if (!e.medium) return { media_pfad: null, media_mime: null, media_name: null }
  const geladen = await whatsappProvider().ladeMedium(e.medium.mediaId)
  if (!geladen.ok) {
    console.warn('[whatsapp] Medium nicht geladen:', geladen.fehler)
    return { media_pfad: null, media_mime: e.medium.mime, media_name: e.medium.name }
  }
  const ext = geladen.mime.includes('pdf') ? 'pdf' : geladen.mime.split('/')[1]?.split(';')[0] || 'bin'
  const pfad = `${e.von}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
  const { error } = await db.storage
    .from(WHATSAPP_MEDIEN_BUCKET)
    .upload(pfad, geladen.buffer, { contentType: geladen.mime, upsert: false })
  if (error) {
    logDbError('lib/whatsapp/dienst:upload', error)
    return { media_pfad: null, media_mime: geladen.mime, media_name: e.medium.name }
  }
  return { media_pfad: pfad, media_mime: geladen.mime, media_name: e.medium.name ?? `WhatsApp.${ext}` }
}

/** Einsatz-Knopf ausführen (gleicher Schritt wie „Annehmen“/„Ablehnen“ im Partner-Portal). */
async function einsatzKnopf(db: SupabaseClient, kontakt: WaKontakt, knopfId: string, mock: boolean): Promise<void> {
  const k = parseEinsatzKnopfId(knopfId)
  if (!k || kontakt.typ !== 'handwerker') return
  const { data: e } = await db
    .from('einsaetze')
    .select('id, auftrag_id, titel, status, handwerker_id')
    .eq('id', k.einsatzId)
    .maybeSingle()
  if (!e || String(e.handwerker_id) !== kontakt.id) return
  const now = new Date().toISOString()
  let antwort: string
  if (String(e.status) !== 'gesendet') {
    antwort = `Danke! Der Einsatz „${e.titel}“ ist bereits ${e.status === 'angenommen' ? 'angenommen' : 'erledigt'}.`
  } else if (k.antwort === 'annehmen') {
    const w = await writeEinsatzStatus(db, {
      einsatzId: k.einsatzId,
      handwerkerId: kontakt.id,
      von: 'gesendet',
      nach: 'angenommen',
      extra: { angenommen_at: now, angenommen_von: 'partner' },
    })
    antwort = w.ok
      ? `Danke, der Einsatz „${e.titel}“ ist angenommen. Fotos und Updates können Sie einfach hier schicken.`
      : 'Das hat leider nicht geklappt. Wir melden uns.'
  } else {
    const w = await writeEinsatzStatus(db, {
      einsatzId: k.einsatzId,
      handwerkerId: kontakt.id,
      von: 'gesendet',
      nach: 'abgelehnt',
      extra: { abgelehnt_at: now, ablehnung_grund: 'Per WhatsApp abgelehnt' },
    })
    antwort = w.ok
      ? `Alles klar, wir haben die Absage für „${e.titel}“ vermerkt. Danke für die schnelle Rückmeldung.`
      : 'Das hat leider nicht geklappt. Wir melden uns.'
  }
  await nachrichtSenden(db, {
    kontakt,
    text: antwort,
    auftragId: String(e.auftrag_id),
    einsatzId: String(e.id),
    userId: null,
    mock,
  })
}

/** Webhook-Inhalt verarbeiten: Nachrichten speichern + zuordnen, Zustellstatus nachtragen. */
export async function webhookVerarbeiten(
  db: SupabaseClient,
  payload: unknown,
  opts: { mock?: boolean; mockMedium?: { url: string; name: string; mime: string } | null } = {}
): Promise<{ nachrichten: number; status: number }> {
  let nachrichten = 0
  let status = 0
  for (const ev of parseWhatsAppWebhook(payload)) {
    if (ev.typ === 'status') {
      const w = await writeWhatsAppStatus(db, { waId: ev.waId, status: ev.status, fehler: ev.fehler })
      if (!w.ok) console.warn('[whatsapp] Status:', w.error)
      else status += 1
      continue
    }
    // Doppelte Zustellung (WhatsApp wiederholt bei Zeitüberschreitung)
    const { data: schon } = await db.from('whatsapp_nachrichten').select('id').eq('wa_id', ev.waId).maybeSingle()
    if (schon) continue
    const kontakt = await kontaktZuNummer(db, ev.von)
    const ziel = await zuordnen(db, kontakt, ev)
    const medium = opts.mock
      ? {
          media_pfad: null,
          media_url: opts.mockMedium?.url ?? null,
          media_mime: opts.mockMedium?.mime ?? null,
          media_name: opts.mockMedium?.name ?? null,
        }
      : await mediumSpeichern(db, ev)
    const { error } = await db.from('whatsapp_nachrichten').insert({
      richtung: 'ein',
      kontakt_typ: kontakt?.typ ?? 'unbekannt',
      handwerker_id: kontakt?.typ === 'handwerker' ? kontakt.id : null,
      kunde_id: kontakt?.typ === 'kunde' ? kontakt.id : null,
      telefon: waNummer(ev.von) ?? ev.von,
      auftrag_id: ziel.auftrag_id,
      einsatz_id: ziel.einsatz_id,
      art: ev.art,
      text: ev.text ?? (kontakt ? null : ev.profilName ? `(${ev.profilName})` : null),
      ...medium,
      knopf_id: ev.knopfId,
      antwort_auf_wa_id: ev.antwortAufWaId,
      status: 'empfangen',
      wa_id: ev.waId,
      created_at: ev.zeit,
      ist_mock: Boolean(opts.mock),
    })
    if (error) {
      logDbError('lib/whatsapp/dienst:eingang', error)
      continue
    }
    nachrichten += 1
    if (kontakt && ev.knopfId) await einsatzKnopf(db, kontakt, ev.knopfId, Boolean(opts.mock))
  }
  return { nachrichten, status }
}

/**
 * Nachricht senden und im Verlauf speichern. Außerhalb des 24-Stunden-Fensters geht freier Text
 * automatisch als Vorlage „bw_nachricht“ raus (nur so erlaubt WhatsApp den ersten Kontakt).
 */
export async function nachrichtSenden(
  db: SupabaseClient,
  input: {
    kontakt: WaKontakt
    text?: string
    vorlage?: { name: VorlagenName; werte: string[]; knopfIds?: string[] }
    knoepfe?: { id: string; titel: string }[]
    /** pfad = Datei im Bucket whatsapp-medien (url ist dann nur der befristete Link für WhatsApp) */
    medium?: { url: string; art: 'bild' | 'dokument' | 'audio' | 'video'; name?: string | null; pfad?: string | null; mime?: string | null }
    auftragId?: string | null
    einsatzId?: string | null
    userId: string | null
    mock?: boolean
  }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const p = whatsappProvider()
  const offen = await imFenster(db, input.kontakt.nummer)
  let art: 'text' | 'vorlage' | 'knoepfe' | 'bild' | 'dokument' | 'audio' | 'video' = 'text'
  let text = input.text?.trim() ?? ''
  let knoepfe: { id: string; titel: string }[] | null = null
  let vorlage: string | null = null
  let ergebnis

  if (input.vorlage && !(offen && input.knoepfe?.length)) {
    // Vorlage (Pflicht außerhalb des Fensters); im Fenster mit Knöpfen lieber interaktiv
    const v = vorlageAnzeige(input.vorlage.name, input.vorlage.werte)
    art = 'vorlage'
    vorlage = input.vorlage.name
    text = v.text
    knoepfe = (input.vorlage.knopfIds ?? []).map((id, i) => ({ id, titel: v.knoepfe[i] ?? id }))
    ergebnis = await p.sendeVorlage(input.kontakt.nummer, input.vorlage.name, input.vorlage.werte, input.vorlage.knopfIds)
  } else if (input.knoepfe?.length) {
    art = 'knoepfe'
    knoepfe = input.knoepfe
    if (input.vorlage) text = vorlageAnzeige(input.vorlage.name, input.vorlage.werte).text
    ergebnis = await p.sendeKnoepfe(input.kontakt.nummer, text, input.knoepfe)
  } else if (input.medium) {
    art = input.medium.art
    ergebnis = await p.sendeMedium(input.kontakt.nummer, { ...input.medium, caption: text || null })
  } else if (!text) {
    return { ok: false, message: 'Bitte eine Nachricht eingeben.' }
  } else if (offen) {
    ergebnis = await p.sendeText(input.kontakt.nummer, text)
  } else {
    art = 'vorlage'
    vorlage = 'bw_nachricht'
    ergebnis = await p.sendeVorlage(input.kontakt.nummer, 'bw_nachricht', [text])
    text = vorlageAnzeige('bw_nachricht', [text]).text
  }

  const { data, error } = await db
    .from('whatsapp_nachrichten')
    .insert({
      richtung: 'aus',
      kontakt_typ: input.kontakt.typ,
      handwerker_id: input.kontakt.typ === 'handwerker' ? input.kontakt.id : null,
      kunde_id: input.kontakt.typ === 'kunde' ? input.kontakt.id : null,
      telefon: input.kontakt.nummer,
      auftrag_id: input.auftragId ?? null,
      einsatz_id: input.einsatzId ?? null,
      art,
      text: text || null,
      media_pfad: input.medium?.pfad ?? null,
      media_url: input.medium && !input.medium.pfad ? input.medium.url : null,
      media_name: input.medium?.name ?? null,
      media_mime: input.medium?.mime ?? null,
      knoepfe,
      vorlage,
      // Testmodus: sofort „zugestellt“; echt: Status kommt per Webhook
      status: ergebnis.ok ? (p.modus === 'mock' ? 'zugestellt' : 'gesendet') : 'fehler',
      fehler: ergebnis.ok ? null : ergebnis.fehler,
      wa_id: ergebnis.ok ? ergebnis.waId : null,
      erstellt_von: input.userId,
      ist_mock: p.modus === 'mock' || Boolean(input.mock),
    })
    .select('id')
    .single()
  if (error || !data) {
    logDbError('lib/whatsapp/dienst:senden', error)
    return { ok: false, message: 'Nachricht konnte nicht gespeichert werden.' }
  }
  if (!ergebnis.ok) return { ok: false, message: ergebnis.fehler }
  return { ok: true, id: String(data.id) }
}

/** Neuer Einsatz per WhatsApp: Vorlage mit Annehmen/Ablehnen. */
export async function einsatzPerWhatsApp(
  db: SupabaseClient,
  einsatzId: string,
  userId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: e } = await db
    .from('einsaetze')
    .select('id, auftrag_id, handwerker_id, titel, anweisung, termin_von, termin_bis, ort, ek_betrag, ek_art')
    .eq('id', einsatzId)
    .maybeSingle()
  if (!e) return { ok: false, message: 'Einsatz nicht gefunden.' }
  const kontakt = await kontaktLaden(db, { handwerkerId: String(e.handwerker_id) })
  if (!kontakt) return { ok: false, message: 'Für diesen Partner ist keine WhatsApp-/Handynummer hinterlegt.' }
  const termin =
    e.termin_von && e.termin_bis && e.termin_von !== e.termin_bis
      ? `${formatDatum(String(e.termin_von))} bis ${formatDatum(String(e.termin_bis))}`
      : e.termin_von
        ? formatDatum(String(e.termin_von))
        : 'nach Absprache'
  const werte = [
    kontakt.name,
    String(e.titel ?? ''),
    termin,
    String(e.ort ?? '').trim() || '—',
    e.ek_betrag != null ? `${formatEuro(Number(e.ek_betrag))} ${e.ek_art === 'brutto' ? 'brutto' : 'netto'}` : '—',
    String(e.anweisung ?? '').trim().slice(0, 600) || 'Details folgen.',
  ]
  const knopfIds = [einsatzKnopfId(einsatzId, 'annehmen'), einsatzKnopfId(einsatzId, 'ablehnen')]
  return nachrichtSenden(db, {
    kontakt,
    vorlage: { name: 'bw_einsatz_neu', werte, knopfIds },
    knoepfe: [
      { id: knopfIds[0]!, titel: 'Annehmen' },
      { id: knopfIds[1]!, titel: 'Ablehnen' },
    ],
    auftragId: String(e.auftrag_id),
    einsatzId,
    userId,
  })
}

/** Tagebuch-Eintrag an den Kunden: kurzer Text + Link zur Projektseite (ohne Login). */
export async function bautagebuchPerWhatsApp(
  db: SupabaseClient,
  input: { auftragId: string; titel: string; text?: string | null; userId: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: auf } = await db
    .from('auftraege')
    .select('id, titel, kunde_id')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (!auf?.kunde_id) return { ok: false, message: 'Der Auftrag hat keinen Kunden.' }
  const kontakt = await kontaktLaden(db, { kundeId: String(auf.kunde_id) })
  if (!kontakt) return { ok: false, message: 'Für den Kunden ist keine Handynummer hinterlegt.' }
  const { ensureKundenTokenForAuftrag } = await import('@/lib/projekt/kunden-token')
  const { projektUrlFromToken } = await import('@/lib/projekt/projekt-url')
  const token = await ensureKundenTokenForAuftrag(input.auftragId)
  if (!token) return { ok: false, message: 'Projekt-Link konnte nicht erstellt werden.' }
  const inhalt = [input.titel.trim(), String(input.text ?? '').trim()].filter(Boolean).join(' — ').slice(0, 500)
  return nachrichtSenden(db, {
    kontakt,
    vorlage: {
      name: 'bw_bautagebuch',
      werte: [kontakt.name, String(auf.titel ?? 'Ihr Projekt'), inhalt || 'Neue Fotos und Infos', projektUrlFromToken(token)],
    },
    auftragId: input.auftragId,
    userId: input.userId,
  }).then((r) => (r.ok ? { ok: true as const } : r))
}

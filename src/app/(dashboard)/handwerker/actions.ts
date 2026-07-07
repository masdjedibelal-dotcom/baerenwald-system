'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  buildHandwerkerStammDbPayload,
  validateHandwerkerStammPflicht,
} from '@/lib/handwerker-stammdaten'
import {
  PARTNER_DOCS_BUCKET,
  parseStoredDocumentRef,
  partnerDokumentStoragePath,
  VERTRAEGE_PDFS_BUCKET,
} from '@/lib/partnerDocUtils'
import type { Handwerker, PartnerDokument } from '@/lib/types'

export type HandwerkerFormInput = {
  firma: string | null
  vorname: string | null
  nachname: string | null
  email: string | null
  telefon: string | null
  whatsapp: string | null
  webseite: string | null
  adresse: string | null
  gewerke: string[]
  subkategorie: string | null
  ist_fachbetrieb: boolean
  partner_kategorie_id: string | null
  steuernummer: string | null
  ustid: string | null
  iban: string | null
  aktiv: boolean
  notizen: string | null
}

function handwerkerStammFromInput(input: HandwerkerFormInput) {
  const err = validateHandwerkerStammPflicht(input)
  if (err) return { ok: false as const, message: err }
  const stamm = buildHandwerkerStammDbPayload(input)
  if (!stamm.name) return { ok: false as const, message: 'Name konnte nicht ermittelt werden.' }
  return { ok: true as const, stamm }
}

export async function createHandwerker(
  input: HandwerkerFormInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const parsed = handwerkerStammFromInput(input)
  if (!parsed.ok) return parsed

  const supabase = createClient()
  const { data, error } = await supabase
    .from('handwerker')
    .insert({
      name: parsed.stamm.name,
      firma: parsed.stamm.firma,
      vorname: parsed.stamm.vorname,
      nachname: parsed.stamm.nachname,
      email: input.email?.trim() || null,
      telefon: input.telefon?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      webseite: input.webseite?.trim() || null,
      adresse: input.adresse?.trim() || null,
      gewerke: input.gewerke,
      subkategorie: input.subkategorie?.trim() || null,
      ist_fachbetrieb: input.ist_fachbetrieb,
      partner_kategorie_id: input.partner_kategorie_id,
      steuernummer: input.steuernummer?.trim() || null,
      ustid: input.ustid?.trim() || null,
      iban: input.iban?.replace(/\s+/g, '') || null,
      aktiv: input.aktiv,
      notizen: input.notizen?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath('/handwerker')
  return { ok: true, id: data.id as string }
}

export async function updateHandwerker(
  id: string,
  input: HandwerkerFormInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = handwerkerStammFromInput(input)
  if (!parsed.ok) return parsed

  const supabase = createClient()
  const { error } = await supabase
    .from('handwerker')
    .update({
      name: parsed.stamm.name,
      firma: parsed.stamm.firma,
      vorname: parsed.stamm.vorname,
      nachname: parsed.stamm.nachname,
      email: input.email?.trim() || null,
      telefon: input.telefon?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      webseite: input.webseite?.trim() || null,
      adresse: input.adresse?.trim() || null,
      gewerke: input.gewerke,
      subkategorie: input.subkategorie?.trim() || null,
      ist_fachbetrieb: input.ist_fachbetrieb,
      partner_kategorie_id: input.partner_kategorie_id,
      steuernummer: input.steuernummer?.trim() || null,
      ustid: input.ustid?.trim() || null,
      iban: input.iban?.replace(/\s+/g, '') || null,
      aktiv: input.aktiv,
      notizen: input.notizen?.trim() || null,
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  revalidatePath('/handwerker')
  revalidatePath(`/handwerker/${id}`)
  return { ok: true }
}

export async function updateHandwerkerNotizen(
  id: string,
  notizen: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('handwerker')
    .update({ notizen: notizen?.trim() || null })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/handwerker/${id}`)
  return { ok: true }
}

export async function loadHandwerkerListe(): Promise<Handwerker[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('handwerker')
    .select(
      `
      id, name, firma, vorname, nachname, email, telefon, whatsapp, webseite, gewerke, subkategorie,
      ist_fachbetrieb, compliance_status, steuernummer, ustid, iban, aktiv, notizen, created_at,
      adresse, partner_kategorie_id,
      partner_kategorien ( id, name, slug, sort_order )
    `
    )
    .order('subkategorie', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) {
    console.error(error)
    return []
  }
  return (data ?? []) as unknown as Handwerker[]
}

export type HandwerkerDetailPayload = {
  handwerker: Handwerker | null
  dokumente: PartnerDokument[]
  auftraege: {
    id: string
    titel: string | null
    /** Status der Zuordnung auftrag_handwerker */
    status: string
    /** Status des Auftrags (für aktiv / abgeschlossen) */
    auftrag_status: string
    created_at: string
    gewerk_name: string | null
    kunde_name: string | null
  }[]
  stats: { gesamt: number; angenommen: number; abgelehnt: number; quote: number | null }
}

const HANDWERKER_DETAIL_SELECT_BASE = `
  id, name, firma, vorname, nachname, email, telefon, whatsapp, webseite, gewerke, subkategorie,
  ist_fachbetrieb, compliance_status, steuernummer, ustid, iban, aktiv, notizen, created_at,
  adresse, partner_kategorie_id,
  partner_kategorien ( id, name, slug, sort_order ),
  partner_dokumente (
    id, handwerker_id, auftrag_id, typ, bezeichnung, gueltig_bis, datei_url, notizen, hochgeladen_am,
    status, freigegeben_am, ablehnung_grund
  )
`

const HANDWERKER_BEWERTUNG_SELECT = `
  bewertung_gesamt, bewertung_qualitaet, bewertung_termintreue, bewertung_sauberkeit,
  bewertung_kommunikation, bewertung_preis_leistung, bewertung_anzahl
`

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    (msg.includes('column') && msg.includes('bewertung'))
  )
}

async function fetchHandwerkerDetailRow(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<{ data: Handwerker | null; error: { message: string } | null }> {
  const fullSelect = `${HANDWERKER_DETAIL_SELECT_BASE}, ${HANDWERKER_BEWERTUNG_SELECT}`
  const first = await supabase.from('handwerker').select(fullSelect).eq('id', id).maybeSingle()

  if (!first.error) {
    return { data: (first.data as Handwerker | null) ?? null, error: null }
  }

  if (isMissingColumnError(first.error)) {
    console.warn(
      '[loadHandwerkerDetail] Bewertungs-Spalten fehlen — Fallback ohne Ratings:',
      first.error.message
    )
    const fallback = await supabase
      .from('handwerker')
      .select(HANDWERKER_DETAIL_SELECT_BASE)
      .eq('id', id)
      .maybeSingle()
    return {
      data: (fallback.data as Handwerker | null) ?? null,
      error: fallback.error ? { message: fallback.error.message } : null,
    }
  }

  console.error('[loadHandwerkerDetail]', first.error.message)
  return { data: null, error: { message: first.error.message } }
}

export async function loadHandwerkerDetail(id: string): Promise<HandwerkerDetailPayload> {
  const supabase = createClient()

  const [{ data: h }, { data: ahRaw }] = await Promise.all([
    fetchHandwerkerDetailRow(supabase, id),
    supabase
      .from('auftrag_handwerker')
      .select(
        `
        id, status, created_at,
        gewerke ( name ),
        auftraege ( id, titel, status, created_at, kunden ( name ) )
      `
      )
      .eq('handwerker_id', id)
      .order('created_at', { ascending: false })
      .limit(120),
  ])

  const hw = (h as Handwerker | null) ?? null
  const dokumente = (hw?.partner_dokumente ?? []) as PartnerDokument[]

  const rows = ahRaw ?? []
  const auftraege = rows
    .map((r) => {
      const aRaw = r.auftraege as unknown
      const a = (
        Array.isArray(aRaw) ? (aRaw[0] as Record<string, unknown> | undefined) : (aRaw as Record<string, unknown> | null)
      ) as {
        id: string
        titel: string | null
        status: string
        created_at: string
        kunden: { name: string } | { name: string }[] | null
      } | null
      if (!a?.id) return null
      const gRaw = r.gewerke as unknown
      const g = (Array.isArray(gRaw) ? gRaw[0] : gRaw) as { name: string } | null | undefined
      const kRaw = a.kunden
      const k = (Array.isArray(kRaw) ? kRaw[0] : kRaw) as { name: string } | null | undefined
      return {
        id: a.id,
        titel: a.titel,
        status: (r.status as string) ?? '—',
        auftrag_status: (a.status as string) ?? 'offen',
        created_at: a.created_at,
        gewerk_name: g?.name ?? null,
        kunde_name: k?.name ?? null,
      }
    })
    .filter(Boolean) as HandwerkerDetailPayload['auftraege']

  const gesamt = auftraege.length
  const angenommen = auftraege.filter((x) => /akzept|angenom|zugew|in_arbeit/i.test(x.status)).length
  const abgelehnt = auftraege.filter((x) => /abgelehnt|ablehn/i.test(x.status)).length
  const entschieden = angenommen + abgelehnt
  const quote = entschieden > 0 ? Math.round((angenommen / entschieden) * 100) : null

  return {
    handwerker: hw ? { ...hw, partner_dokumente: dokumente } : null,
    dokumente,
    auftraege,
    stats: { gesamt, angenommen, abgelehnt, quote },
  }
}

function revalidatePartnerDokumentPfade(handwerkerId: string, auftragId?: string | null) {
  revalidatePath(`/handwerker/${handwerkerId}`)
  revalidatePath('/handwerker')
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)
}

export async function loadPartnerDokumenteForAuftrag(
  auftragId: string
): Promise<PartnerDokument[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('partner_dokumente')
    .select(
      'id, handwerker_id, auftrag_id, typ, bezeichnung, gueltig_bis, datei_url, notizen, hochgeladen_am, status, freigegeben_am, ablehnung_grund'
    )
    .eq('auftrag_id', auftragId)
    .order('hochgeladen_am', { ascending: false })
  if (error) {
    console.warn('loadPartnerDokumenteForAuftrag', error.message)
    return []
  }
  return (data ?? []) as PartnerDokument[]
}

export async function insertPartnerDokument(input: {
  handwerker_id: string
  auftrag_id?: string | null
  typ: string
  bezeichnung: string
  gueltig_bis: string | null
  datei_url: string | null
  notizen: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('partner_dokumente')
    .insert({
      handwerker_id: input.handwerker_id,
      auftrag_id: input.auftrag_id ?? null,
      typ: input.typ.trim(),
      bezeichnung: input.bezeichnung.trim(),
      gueltig_bis: input.gueltig_bis || null,
      datei_url: input.datei_url,
      notizen: input.notizen?.trim() || null,
      status: 'freigegeben',
      freigegeben_am: now,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePartnerDokumentPfade(input.handwerker_id, input.auftrag_id)
  return { ok: true, id: data.id as string }
}

/** Ersetzt vorhandenes Dokument desselben Typs (ein Nachweis pro Typ/Kontext). */
export async function replacePartnerDokumentForTyp(input: {
  handwerker_id: string
  auftrag_id?: string | null
  typ: string
  bezeichnung: string
  gueltig_bis: string | null
  datei_url: string
  notizen?: string | null
  mehrfach?: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (input.mehrfach) {
    return insertPartnerDokument({
      handwerker_id: input.handwerker_id,
      auftrag_id: input.auftrag_id ?? null,
      typ: input.typ.trim(),
      bezeichnung: input.bezeichnung,
      gueltig_bis: input.gueltig_bis,
      datei_url: input.datei_url,
      notizen: input.notizen ?? null,
    })
  }

  const supabase = createClient()
  const typ = input.typ.trim()
  let q = supabase
    .from('partner_dokumente')
    .select('id, datei_url')
    .eq('handwerker_id', input.handwerker_id)
    .eq('typ', typ)

  if (input.auftrag_id) {
    q = q.eq('auftrag_id', input.auftrag_id)
  } else {
    q = q.is('auftrag_id', null)
  }

  const { data: existing } = await q

  for (const row of existing ?? []) {
    const path = partnerDokumentStoragePath((row as { datei_url?: string | null }).datei_url)
    if (path) {
      await supabase.storage.from(PARTNER_DOCS_BUCKET).remove([path])
    }
    await supabase.from('partner_dokumente').delete().eq('id', (row as { id: string }).id)
  }

  return insertPartnerDokument({
    handwerker_id: input.handwerker_id,
    auftrag_id: input.auftrag_id ?? null,
    typ,
    bezeichnung: input.bezeichnung,
    gueltig_bis: input.gueltig_bis,
    datei_url: input.datei_url,
    notizen: input.notizen ?? null,
  })
}

export async function updatePartnerDokument(
  id: string,
  handwerker_id: string,
  patch: {
    bezeichnung?: string
    gueltig_bis?: string | null
    notizen?: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const row: Record<string, unknown> = {}
  if (patch.bezeichnung !== undefined) row.bezeichnung = patch.bezeichnung.trim()
  if (patch.gueltig_bis !== undefined) row.gueltig_bis = patch.gueltig_bis?.trim() || null
  if (patch.notizen !== undefined) row.notizen = patch.notizen?.trim() || null
  if (Object.keys(row).length === 0) return { ok: true }
  const { error } = await supabase.from('partner_dokumente').update(row).eq('id', id)
  if (error) return { ok: false, message: error.message }
  const { data: doc } = await supabase
    .from('partner_dokumente')
    .select('auftrag_id')
    .eq('id', id)
    .maybeSingle()
  revalidatePartnerDokumentPfade(
    handwerker_id,
    (doc as { auftrag_id?: string | null } | null)?.auftrag_id
  )
  return { ok: true }
}

/** Kurzzeit-Link zum Öffnen (privater Bucket + Vertrags-PDFs). */
export async function signPartnerDokumentUrl(
  stored: string | null | undefined
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const s = stored?.trim() ?? ''
  if (!s) return { ok: false, message: 'Keine Datei hinterlegt.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const ref = parseStoredDocumentRef(s)
  if (ref?.path) {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data, error } = await supabaseAdmin.storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, 3600)

    if (!error && data?.signedUrl) {
      return { ok: true, url: data.signedUrl }
    }

    if (ref.bucket === VERTRAEGE_PDFS_BUCKET) {
      const { data: pub } = supabaseAdmin.storage.from(ref.bucket).getPublicUrl(ref.path)
      if (pub.publicUrl) return { ok: true, url: pub.publicUrl }
    }

    const msg = error?.message ?? ''
    if (/not found|object not found/i.test(msg)) {
      return {
        ok: false,
        message:
          'Datei im Storage nicht gefunden — das Dokument wurde ggf. gelöscht oder verschoben. Bitte erneut hochladen.',
      }
    }
    return { ok: false, message: msg || 'Signierte URL fehlgeschlagen' }
  }

  if (/^https?:\/\//i.test(s)) {
    return { ok: true, url: s }
  }

  return { ok: false, message: 'Keine gültige Datei-Referenz.' }
}

export async function deletePartnerDokument(
  id: string,
  handwerker_id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('partner_dokumente')
    .select('datei_url, auftrag_id')
    .eq('id', id)
    .maybeSingle()
  const path = partnerDokumentStoragePath((row as { datei_url?: string | null } | null)?.datei_url)
  if (path) {
    await supabase.storage.from(PARTNER_DOCS_BUCKET).remove([path])
  }
  const { error } = await supabase.from('partner_dokumente').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePartnerDokumentPfade(
    handwerker_id,
    (row as { auftrag_id?: string | null } | null)?.auftrag_id
  )
  return { ok: true }
}

/** CRM: Partner-Upload freigeben (Portal-Workflow). */
export async function freigebenPartnerDokument(
  id: string,
  handwerkerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const now = new Date().toISOString()
  const { data: doc, error } = await supabase
    .from('partner_dokumente')
    .update({
      status: 'freigegeben',
      freigegeben_am: now,
      ablehnung_grund: null,
    })
    .eq('id', id)
    .eq('handwerker_id', handwerkerId)
    .select('auftrag_id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!doc) return { ok: false, message: 'Dokument nicht gefunden' }

  revalidatePartnerDokumentPfade(handwerkerId, (doc as { auftrag_id?: string | null }).auftrag_id)
  return { ok: true }
}

/** CRM: Partner-Upload ablehnen (Portal-Workflow). */
export async function ablehnenPartnerDokument(
  id: string,
  handwerkerId: string,
  grund: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const reason = grund.trim()
  if (!reason) return { ok: false, message: 'Bitte einen Ablehnungsgrund angeben.' }

  const { data: doc, error } = await supabase
    .from('partner_dokumente')
    .update({
      status: 'abgelehnt',
      ablehnung_grund: reason,
      freigegeben_am: null,
    })
    .eq('id', id)
    .eq('handwerker_id', handwerkerId)
    .select('auftrag_id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!doc) return { ok: false, message: 'Dokument nicht gefunden' }

  revalidatePartnerDokumentPfade(handwerkerId, (doc as { auftrag_id?: string | null }).auftrag_id)
  return { ok: true }
}

export async function getPartnerPortalLoginHint(
  handwerkerId: string
): Promise<
  | { ok: true; loginLink: string; hasAuthAccount: boolean }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('handwerker')
    .select('auth_user_id')
    .eq('id', handwerkerId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }

  const { buildPartnerDashboardLink } = await import('@/lib/portal-utils')
  return {
    ok: true,
    loginLink: buildPartnerDashboardLink(),
    hasAuthAccount: Boolean(
      (row as { auth_user_id?: string | null } | null)?.auth_user_id
    ),
  }
}

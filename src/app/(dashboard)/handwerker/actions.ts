'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { PARTNER_DOCS_BUCKET, partnerDokumentStoragePath } from '@/lib/partnerDocUtils'
import type { ComplianceDokumentTyp, Handwerker, PartnerDokument } from '@/lib/types'

export type HandwerkerFormInput = {
  name: string
  firma: string | null
  email: string | null
  telefon: string
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

export async function createHandwerker(
  input: HandwerkerFormInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('handwerker')
    .insert({
      name: input.name.trim(),
      firma: input.firma?.trim() || null,
      email: input.email?.trim() || null,
      telefon: input.telefon.trim(),
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
  const supabase = createClient()
  const { error } = await supabase
    .from('handwerker')
    .update({
      name: input.name.trim(),
      firma: input.firma?.trim() || null,
      email: input.email?.trim() || null,
      telefon: input.telefon.trim(),
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
      updated_at: new Date().toISOString(),
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
    .update({ notizen: notizen?.trim() || null, updated_at: new Date().toISOString() })
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
      id, name, firma, email, telefon, whatsapp, webseite, gewerke, subkategorie,
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
  typen: ComplianceDokumentTyp[]
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

export async function loadHandwerkerDetail(id: string): Promise<HandwerkerDetailPayload> {
  const supabase = createClient()

  const [{ data: h }, { data: typenRaw }, { data: ahRaw }] = await Promise.all([
    supabase
      .from('handwerker')
      .select(
        `
        id, name, firma, email, telefon, whatsapp, webseite, gewerke, subkategorie,
        ist_fachbetrieb, compliance_status, steuernummer, ustid, iban, aktiv, notizen, created_at,
        adresse, partner_kategorie_id,
        partner_kategorien ( id, name, slug, sort_order ),
        partner_dokumente (
          id, handwerker_id, typ, bezeichnung, gueltig_bis, datei_url, notizen, hochgeladen_am
        )
      `
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('compliance_dokument_typen')
      .select(
        'id, slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, erneuerung_monate, sort_order, kategorie, aktiv'
      )
      .order('sort_order', { ascending: true }),
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
  const typen = (typenRaw ?? []).filter(
    (t: { aktiv?: boolean }) => t.aktiv !== false
  ) as ComplianceDokumentTyp[]

  const dokumenteRaw = (hw?.partner_dokumente ?? []) as PartnerDokument[]
  const dokumente = dokumenteRaw.map((d) => ({
    ...d,
    compliance_dokument_typen: typen.find((t) => t.slug === d.typ) ?? null,
  }))

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
    typen,
    auftraege,
    stats: { gesamt, angenommen, abgelehnt, quote },
  }
}

export async function insertPartnerDokument(input: {
  handwerker_id: string
  typ: string
  bezeichnung: string
  gueltig_bis: string | null
  datei_url: string | null
  notizen: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('partner_dokumente')
    .insert({
      handwerker_id: input.handwerker_id,
      typ: input.typ.trim(),
      bezeichnung: input.bezeichnung.trim(),
      gueltig_bis: input.gueltig_bis || null,
      datei_url: input.datei_url,
      notizen: input.notizen?.trim() || null,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath(`/handwerker/${input.handwerker_id}`)
  revalidatePath('/handwerker')
  return { ok: true, id: data.id as string }
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
  revalidatePath(`/handwerker/${handwerker_id}`)
  revalidatePath('/handwerker')
  return { ok: true }
}

/** Kurzzeit-Link zum Öffnen (privater Bucket). */
export async function signPartnerDokumentUrl(
  stored: string | null | undefined
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const path = partnerDokumentStoragePath(stored)
  if (!path) return { ok: false, message: 'Keine Datei hinterlegt.' }
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(PARTNER_DOCS_BUCKET)
    .createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? 'Signierte URL fehlgeschlagen' }
  }
  return { ok: true, url: data.signedUrl }
}

export async function deletePartnerDokument(
  id: string,
  handwerker_id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('partner_dokumente')
    .select('datei_url')
    .eq('id', id)
    .maybeSingle()
  const path = partnerDokumentStoragePath((row as { datei_url?: string | null } | null)?.datei_url)
  if (path) {
    await supabase.storage.from(PARTNER_DOCS_BUCKET).remove([path])
  }
  const { error } = await supabase.from('partner_dokumente').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/handwerker/${handwerker_id}`)
  revalidatePath('/handwerker')
  return { ok: true }
}

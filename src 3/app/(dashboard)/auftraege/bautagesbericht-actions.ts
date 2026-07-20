'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import {
  BAUTAGESBERICHT_MAX_FOTOS,
  DEFAULT_BAUTAGESBERICHT_RISIKEN,
  parseBautagesberichtFotos,
  parseStringList,
  type AuftragBautagesbericht,
  type BautagesberichtFoto,
} from '@/lib/auftraege/bautagesbericht-types'
import { renderBautagesberichtPdfBuffer } from '@/lib/auftraege/render-bautagesbericht-pdf'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import type { Kunde } from '@/lib/types'

function mapBericht(row: Record<string, unknown>): AuftragBautagesbericht {
  const hwRaw = row.handwerker
  const hwOne = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  return {
    id: String(row.id),
    auftrag_id: String(row.auftrag_id),
    tag_nummer: Number(row.tag_nummer) || 1,
    datum: String(row.datum).slice(0, 10),
    arbeitszeit_von: row.arbeitszeit_von != null ? String(row.arbeitszeit_von) : null,
    arbeitszeit_bis: row.arbeitszeit_bis != null ? String(row.arbeitszeit_bis) : null,
    wetter: row.wetter != null ? String(row.wetter) : null,
    auftraggeber_name: row.auftraggeber_name != null ? String(row.auftraggeber_name) : null,
    auftraggeber_adresse: row.auftraggeber_adresse != null ? String(row.auftraggeber_adresse) : null,
    nachunternehmer_name: row.nachunternehmer_name != null ? String(row.nachunternehmer_name) : null,
    nachunternehmer_firma: row.nachunternehmer_firma != null ? String(row.nachunternehmer_firma) : null,
    leistungen: parseStringList(row.leistungen),
    behinderungen: row.behinderungen != null ? String(row.behinderungen) : null,
    qualitaetssicherung:
      row.qualitaetssicherung != null ? String(row.qualitaetssicherung) : null,
    risiken: parseStringList(row.risiken),
    zusammenfassung: row.zusammenfassung != null ? String(row.zusammenfassung) : null,
    personal_namen: parseStringList(row.personal_namen),
    fotos: parseBautagesberichtFotos(row.fotos),
    handwerker_id: row.handwerker_id != null ? String(row.handwerker_id) : null,
    handwerker:
      hwOne && typeof hwOne === 'object' && 'name' in hwOne
        ? {
            id: String((hwOne as { id?: string }).id ?? row.handwerker_id ?? ''),
            name: String((hwOne as { name?: string }).name ?? ''),
            firma: (hwOne as { firma?: string | null }).firma ?? null,
          }
        : null,
    pdf_url: row.pdf_url != null ? String(row.pdf_url) : null,
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function resolveFotoUrlsForPdf(fotos: BautagesberichtFoto[]): Promise<BautagesberichtFoto[]> {
  const out: BautagesberichtFoto[] = []
  for (const f of fotos.slice(0, BAUTAGESBERICHT_MAX_FOTOS)) {
    if (/^https?:\/\//i.test(f.url)) {
      out.push(f)
      continue
    }
    const signed = await signedHandwerkerUploadUrl(f.url, 3600)
    if (signed) out.push({ ...f, url: signed })
  }
  return out
}

async function resolveFotosForCrm(fotos: BautagesberichtFoto[]): Promise<BautagesberichtFoto[]> {
  const out: BautagesberichtFoto[] = []
  for (const f of fotos) {
    if (/^https?:\/\//i.test(f.url)) {
      out.push(f)
      continue
    }
    const signed = await signedHandwerkerUploadUrl(f.url, 3600)
    if (signed) out.push({ ...f, url: signed })
  }
  return out
}

const BERICHT_SELECT = `
  *,
  handwerker(id, name, firma)
`

export async function listAuftragBautagesberichte(auftragId: string): Promise<AuftragBautagesbericht[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_bautagesberichte')
    .select(BERICHT_SELECT)
    .eq('auftrag_id', auftragId)
    .order('tag_nummer', { ascending: false })

  if (error) {
    console.warn('[listAuftragBautagesberichte]', error.message)
    return []
  }

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const mapped = mapBericht(row as Record<string, unknown>)
      const foto_display_urls = await resolveFotosForCrm(mapped.fotos)
      return { ...mapped, foto_display_urls }
    })
  )
  return rows
}

async function naechsteTagNummer(auftragId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('auftrag_bautagesberichte')
    .select('tag_nummer')
    .eq('auftrag_id', auftragId)
    .order('tag_nummer', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (Number(data?.tag_nummer) || 0) + 1
}

export type BautagesberichtInput = {
  auftrag_id: string
  datum: string
  arbeitszeit_von?: string | null
  arbeitszeit_bis?: string | null
  wetter?: string | null
  auftraggeber_name?: string | null
  auftraggeber_adresse?: string | null
  nachunternehmer_name?: string | null
  nachunternehmer_firma?: string | null
  leistungen?: string[]
  behinderungen?: string | null
  qualitaetssicherung?: string | null
  risiken?: string[]
  zusammenfassung?: string | null
  personal_namen?: string[]
  fotos?: BautagesberichtFoto[]
  handwerker_id?: string | null
}

function normalizeFotosInput(
  fotos: BautagesberichtFoto[] | null | undefined
): BautagesberichtFoto[] | { ok: false; message: string } {
  const list = parseBautagesberichtFotos(fotos)
  if (list.length > BAUTAGESBERICHT_MAX_FOTOS) {
    return { ok: false, message: `Maximal ${BAUTAGESBERICHT_MAX_FOTOS} Fotos pro Bautagesbericht.` }
  }
  return list
}

export async function createAuftragBautagesbericht(
  input: BautagesberichtInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const fotosNorm = normalizeFotosInput(input.fotos)
  if ('ok' in fotosNorm && fotosNorm.ok === false) return fotosNorm

  const tagNummer = await naechsteTagNummer(input.auftrag_id)
  const risiken =
    input.risiken?.length ? input.risiken.filter((x) => x.trim()) : [...DEFAULT_BAUTAGESBERICHT_RISIKEN]

  const { data, error } = await supabase
    .from('auftrag_bautagesberichte')
    .insert({
      auftrag_id: input.auftrag_id,
      tag_nummer: tagNummer,
      datum: input.datum,
      arbeitszeit_von: input.arbeitszeit_von?.trim() || null,
      arbeitszeit_bis: input.arbeitszeit_bis?.trim() || null,
      wetter: input.wetter?.trim() || null,
      auftraggeber_name: input.auftraggeber_name?.trim() || null,
      auftraggeber_adresse: input.auftraggeber_adresse?.trim() || null,
      nachunternehmer_name: input.nachunternehmer_name?.trim() || null,
      nachunternehmer_firma: input.nachunternehmer_firma?.trim() || null,
      leistungen: (input.leistungen ?? []).filter((x) => x.trim()),
      behinderungen: input.behinderungen?.trim() || null,
      qualitaetssicherung: input.qualitaetssicherung?.trim() || null,
      risiken,
      zusammenfassung: input.zusammenfassung?.trim() || null,
      personal_namen: (input.personal_namen ?? []).filter((x) => x.trim()),
      fotos: fotosNorm,
      handwerker_id: input.handwerker_id?.trim() || null,
      sort_order: tagNummer,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftrag_id,
    typ: 'bautagebuch',
    titel: `Bautagesbericht Tag ${String(tagNummer).padStart(2, '0')} erstellt`,
    beschreibung: input.zusammenfassung?.trim() || null,
    erstellt_von: user.id,
  })

  revalidatePath(`/auftraege/${input.auftrag_id}`)
  return { ok: true, id: data.id as string }
}

export async function updateAuftragBautagesbericht(
  id: string,
  input: Omit<BautagesberichtInput, 'auftrag_id'>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const fotosNorm = normalizeFotosInput(input.fotos)
  if ('ok' in fotosNorm && fotosNorm.ok === false) return fotosNorm

  const { data: existing, error: loadErr } = await supabase
    .from('auftrag_bautagesberichte')
    .select('auftrag_id')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !existing) return { ok: false, message: 'Bautagesbericht nicht gefunden' }

  const { error } = await supabase
    .from('auftrag_bautagesberichte')
    .update({
      datum: input.datum,
      arbeitszeit_von: input.arbeitszeit_von?.trim() || null,
      arbeitszeit_bis: input.arbeitszeit_bis?.trim() || null,
      wetter: input.wetter?.trim() || null,
      auftraggeber_name: input.auftraggeber_name?.trim() || null,
      auftraggeber_adresse: input.auftraggeber_adresse?.trim() || null,
      nachunternehmer_name: input.nachunternehmer_name?.trim() || null,
      nachunternehmer_firma: input.nachunternehmer_firma?.trim() || null,
      leistungen: (input.leistungen ?? []).filter((x) => x.trim()),
      behinderungen: input.behinderungen?.trim() || null,
      qualitaetssicherung: input.qualitaetssicherung?.trim() || null,
      risiken: (input.risiken ?? []).filter((x) => x.trim()),
      zusammenfassung: input.zusammenfassung?.trim() || null,
      personal_namen: (input.personal_namen ?? []).filter((x) => x.trim()),
      fotos: fotosNorm,
      handwerker_id: input.handwerker_id?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${existing.auftrag_id}`)
  return { ok: true }
}

export async function deleteAuftragBautagesbericht(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('auftrag_bautagesberichte')
    .select('auftrag_id, tag_nummer')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return { ok: false, message: 'Nicht gefunden' }

  const { error } = await supabase.from('auftrag_bautagesberichte').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${existing.auftrag_id}`)
  return { ok: true }
}

export async function loadBautagesberichtFuerPdf(
  berichtId: string,
  auftragId: string
): Promise<
  | {
      ok: true
      bericht: AuftragBautagesbericht
      kunde: Kunde | null
      auftragTitel: string
      fotoUrls: BautagesberichtFoto[]
    }
  | { ok: false; message: string }
> {
  const { data: row, error } = await supabaseAdmin
    .from('auftrag_bautagesberichte')
    .select(BERICHT_SELECT)
    .eq('id', berichtId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (error || !row) return { ok: false, message: 'Bautagesbericht nicht gefunden' }

  const { data: auftrag } = await supabaseAdmin
    .from('auftraege')
    .select('titel, created_at, kunden(*)')
    .eq('id', auftragId)
    .maybeSingle()

  const bericht = mapBericht(row as Record<string, unknown>)
  const fotoUrls = await resolveFotoUrlsForPdf(bericht.fotos)
  const kundenRaw = (auftrag as { kunden?: Kunde | Kunde[] | null; titel?: string | null; created_at?: string } | null)?.kunden
  const kunde = Array.isArray(kundenRaw) ? kundenRaw[0] ?? null : kundenRaw ?? null
  const titelRaw = (auftrag as { titel?: string | null; created_at?: string } | null)?.titel

  return {
    ok: true,
    bericht,
    kunde,
    auftragTitel: titelRaw?.trim() || kunde?.name?.trim() || 'Bauprojekt',
    fotoUrls,
  }
}

export async function generateBautagesberichtPdf(
  berichtId: string,
  auftragId: string
): Promise<{ ok: true; pdfUrl: string } | { ok: false; message: string }> {
  const loaded = await loadBautagesberichtFuerPdf(berichtId, auftragId)
  if (!loaded.ok) return loaded

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderBautagesberichtPdfBuffer(loaded.bericht, firm, {
    auftragTitel: loaded.auftragTitel,
    kunde: loaded.kunde,
    handwerkerName: loaded.bericht.handwerker?.name,
    handwerkerFirma: loaded.bericht.handwerker?.firma,
    fotoUrls: loaded.fotoUrls,
  })

  const path = `bautagesberichte/${auftragId}/${berichtId}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)
  const pdfUrl = pub.publicUrl

  await supabaseAdmin
    .from('auftrag_bautagesberichte')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', berichtId)

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, pdfUrl }
}

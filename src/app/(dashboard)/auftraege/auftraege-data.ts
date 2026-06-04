import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { listAuftragBautagebuch } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { normalizeUrlList } from '@/lib/utils'
import type {
  AngebotPosition,
  AuftragDetail,
  AuftragPosition,
  AuftragTimelineEvent,
  FormularTemplate,
} from '@/lib/types'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

/** PostgREST-Select für Auftrags-Detail (Schema-kompatibel, kein formular_eintraege→gewerke). */
const AUFTRAG_DETAIL_SELECT = `
      *,
      kunden(*),
      angebote(*),
      auftrag_handwerker(
        *,
        handwerker(id, name, email, telefon, firma),
        gewerke(id, name, slug)
      ),
      formular_eintraege(
        *,
        formular_templates(id, name, phase, typ, subtyp, felder, gewerk_id, aktiv, gewerke(name)),
        handwerker(name)
      ),
      kalender_termine(*),
      auftrag_timeline(*),
      nachtraege(*),
      punch_list(
        id, auftrag_id, gewerk_id, beschreibung, status, prioritaet,
        foto_urls, foto_nachher_urls, behoben_at, behoben_von, created_at,
        gewerke(id, name, slug)
      ),
      baustopps(*),
      einbehalte(
        *,
        handwerker(id, name, firma),
        buergschaften(*)
      ),
      eingangsrechnungen(*),
      auftrag_milestones(*),
      hw_formular_tabs(
        *,
        hw_formular_einreichungen(*)
      ),
      auftrag_positionen(
        *,
        handwerker(id, name, email, telefon)
      )
    `

function normalizeAngebotJoin(
  raw: unknown
): { positionen?: unknown; [key: string]: unknown } | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === 'object' ? (first as { positionen?: unknown }) : null
  }
  if (typeof raw === 'object') return raw as { positionen?: unknown }
  return null
}

/** Reduziertes Select, falls verschachtelte Relationen im Schema fehlen. */
const AUFTRAG_DETAIL_SELECT_FALLBACK = `
      *,
      kunden(*),
      angebote(*),
      auftrag_timeline(*),
      auftrag_positionen(
        *,
        handwerker(id, name, email, telefon)
      )
    `

function parseAuftragDetailRow(
  data: AuftragDetail & { angebote?: { positionen?: unknown } | null }
): AuftragDetail {
  const ang = normalizeAngebotJoin(data.angebote)
  const tl = (data.auftrag_timeline ?? [])
    .filter((ev): ev is AuftragTimelineEvent => Boolean(ev && typeof ev === 'object' && ev.id))
    .map((ev) => ({
      ...ev,
      foto_urls: normalizeUrlList(ev.foto_urls),
    }))
  tl.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const milestones = [...(data.auftrag_milestones ?? [])]
    .filter(Boolean)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const positionenSorted = [...(data.auftrag_positionen ?? [])]
    .filter((p): p is AuftragPosition => Boolean(p && typeof p === 'object' && p.id))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return {
    ...data,
    auftrag_timeline: tl,
    auftrag_milestones: milestones,
    auftrag_positionen: positionenSorted,
    angebote: ang
      ? ({
          ...ang,
          positionen: parsePositionen(ang.positionen),
        } as AuftragDetail['angebote'])
      : null,
  }
}

async function fetchAuftragDetailRow(
  id: string,
  select: string
): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabaseAdmin.from('auftraege').select(select).eq('id', id).maybeSingle()
  return {
    data: (data as Record<string, unknown> | null) ?? null,
    error: error ? { message: error.message, code: error.code } : null,
  }
}

/** CRM-Detail: Service Role, damit verschachtelte Daten (Kunde, Angebot) zuverlässig geladen werden. */
export async function loadAuftragDetail(id: string): Promise<AuftragDetail | null> {
  try {
    let { data, error } = await fetchAuftragDetailRow(id, AUFTRAG_DETAIL_SELECT)

    if (error) {
      console.warn('[loadAuftragDetail] full select failed, retry minimal:', error.message, error.code)
      const fallback = await fetchAuftragDetailRow(id, AUFTRAG_DETAIL_SELECT_FALLBACK)
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('[loadAuftragDetail]', error.message, error.code)
      return null
    }
    if (!data) return null

    const parsed = parseAuftragDetailRow(
      data as AuftragDetail & { angebote?: { positionen?: unknown } | null }
    )
    parsed.auftrag_bautagebuch = await listAuftragBautagebuch(id)
    return parsed
  } catch (e) {
    console.error('[loadAuftragDetail] unexpected', e)
    return null
  }
}

export type EmailLogRow = {
  id: string
  typ: string
  an_email: string
  an_name: string | null
  betreff: string
  status: string | null
  fehler_nachricht: string | null
  created_at: string
}

export async function loadEmailLogForAuftrag(auftragId: string): Promise<EmailLogRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('email_log')
    .select('id, typ, an_email, an_name, betreff, status, fehler_nachricht, created_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[loadEmailLogForAuftrag]', error.message)
    return []
  }
  return (data ?? []) as EmailLogRow[]
}

export async function loadRechnungenForAuftrag(auftragId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('id, rechnungsnummer, status, brutto, rechnungsdatum, faellig_am, pdf_url, gesendet_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[loadRechnungenForAuftrag]', error.message)
    return []
  }
  return data ?? []
}

export async function listFormularTemplates(): Promise<FormularTemplate[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('formular_templates')
    .select('*')
    .eq('aktiv', true)
    .order('name')
  return (data ?? []) as FormularTemplate[]
}

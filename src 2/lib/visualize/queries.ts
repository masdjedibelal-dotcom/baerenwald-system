import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  KiVizPromptHistoryEntry,
  KiVisualisierung,
  VizBauErklaerung,
  VizBrief,
  VizRaumAnalyse,
} from '@/lib/visualize/types'

function parseHistory(raw: unknown): KiVizPromptHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((e) => e && typeof e === 'object') as KiVizPromptHistoryEntry[]
}

function parseJson<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as T
}

function rowToViz(row: Record<string, unknown>): KiVisualisierung {
  return {
    id: String(row.id),
    angebot_id: String(row.angebot_id),
    ist_bilder_urls: Array.isArray(row.ist_bilder_urls) ? (row.ist_bilder_urls as string[]) : [],
    ziel_bild_url: (row.ziel_bild_url as string | null) ?? null,
    analysierter_prompt: (row.analysierter_prompt as string | null) ?? null,
    wunsch_text: (row.wunsch_text as string | null) ?? null,
    raum_analyse: parseJson<VizRaumAnalyse>(row.raum_analyse),
    inspiration_analyse: parseJson<VizRaumAnalyse>(row.inspiration_analyse),
    viz_brief: parseJson<VizBrief>(row.viz_brief),
    gpt_erklaerung: parseJson<VizBauErklaerung>(row.gpt_erklaerung),
    render_prompt: (row.render_prompt as string | null) ?? null,
    prompt_history: parseHistory(row.prompt_history),
    ausgewaehlte_urls: Array.isArray(row.ausgewaehlte_urls) ? (row.ausgewaehlte_urls as string[]) : [],
    ins_angebot: Boolean(row.ins_angebot),
    status: (row.status as KiVisualisierung['status']) ?? 'neu',
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function loadKiVisualisierung(id: string): Promise<KiVisualisierung | null> {
  const { data, error } = await supabaseAdmin
    .from('ki_visualisierungen')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return rowToViz(data as Record<string, unknown>)
}

export async function loadKiVisualisierungenForAngebot(angebotId: string): Promise<KiVisualisierung[]> {
  const { data, error } = await supabaseAdmin
    .from('ki_visualisierungen')
    .select('*')
    .eq('angebot_id', angebotId)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => rowToViz(r as Record<string, unknown>))
}

export async function createKiVisualisierung(angebotId: string): Promise<KiVisualisierung> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('ki_visualisierungen')
    .insert({
      angebot_id: angebotId,
      status: 'neu',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Session anlegen fehlgeschlagen')
  return rowToViz(data as Record<string, unknown>)
}

export async function updateKiVisualisierung(
  id: string,
  patch: Record<string, unknown>
): Promise<KiVisualisierung | null> {
  const { data, error } = await supabaseAdmin
    .from('ki_visualisierungen')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) return null
  return rowToViz(data as Record<string, unknown>)
}

export async function appendPromptHistory(
  id: string,
  entry: KiVizPromptHistoryEntry
): Promise<KiVisualisierung | null> {
  const current = await loadKiVisualisierung(id)
  if (!current) return null
  const history = [...current.prompt_history, entry]
  return updateKiVisualisierung(id, {
    prompt_history: history,
    status: 'fertig',
  })
}

export async function linkVisualisierungToAngebot(
  angebotId: string,
  visualisierungId: string
): Promise<void> {
  const { data: angebot } = await supabaseAdmin
    .from('angebote')
    .select('visualisierung_ids')
    .eq('id', angebotId)
    .maybeSingle()

  const existing = Array.isArray(angebot?.visualisierung_ids)
    ? (angebot!.visualisierung_ids as string[])
    : []
  if (existing.includes(visualisierungId)) return

  await supabaseAdmin
    .from('angebote')
    .update({ visualisierung_ids: [...existing, visualisierungId] })
    .eq('id', angebotId)
}

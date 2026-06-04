'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  normalizeGewerkAusfuehrung,
  type GewerkAusfuehrung,
} from '@/lib/gewerke-ausfuehrung'

export type GewerkMitCount = {
  id: string
  name: string
  slug: string
  aktiv: boolean
  sort_order: number
  anzahl_leistungen: number
  ausfuehrung: GewerkAusfuehrung
  fachbetrieb_hinweis: string | null
}

export async function loadGewerkeEinstellungen(): Promise<GewerkMitCount[]> {
  const supabase = createClient()
  const { data: gewerke, error } = await supabase
    .from('gewerke')
    .select('id, name, slug, aktiv, sort_order, ausfuehrung, fachbetrieb_hinweis')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.warn('loadGewerkeEinstellungen', error.message)
    return []
  }
  const { data: pl } = await supabase.from('preislisten').select('gewerk_id')
  const counts = new Map<string, number>()
  for (const row of pl ?? []) {
    const gid = (row as { gewerk_id: string }).gewerk_id
    if (!gid) continue
    counts.set(gid, (counts.get(gid) ?? 0) + 1)
  }
  return (gewerke ?? []).map((g) => {
    const row = g as {
      id: string
      name: string
      slug: string
      aktiv: boolean
      sort_order: number
      ausfuehrung?: string | null
      fachbetrieb_hinweis?: string | null
    }
    return {
      ...row,
      ausfuehrung: normalizeGewerkAusfuehrung(row.ausfuehrung),
      fachbetrieb_hinweis: row.fachbetrieb_hinweis?.trim() || null,
      anzahl_leistungen: counts.get(row.id) ?? 0,
    }
  })
}

export async function updateGewerkAusfuehrung(
  id: string,
  patch: { ausfuehrung: GewerkAusfuehrung; fachbetrieb_hinweis: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ausfuehrung = normalizeGewerkAusfuehrung(patch.ausfuehrung)
  const hinweis =
    ausfuehrung === 'eigen' ? null : patch.fachbetrieb_hinweis?.trim() || null
  const supabase = createClient()
  const { error } = await supabase
    .from('gewerke')
    .update({ ausfuehrung, fachbetrieb_hinweis: hinweis })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/gewerke')
  revalidatePath('/einstellungen/preise')
  revalidatePath('/preislisten')
  revalidatePath('/anfragen')
  revalidatePath('/angebote')
  return { ok: true }
}

export async function reorderGewerke(orderedIds: string[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('gewerke')
      .update({ sort_order: i * 10 })
      .eq('id', orderedIds[i])
    if (error) return { ok: false, message: error.message }
  }
  revalidatePath('/einstellungen/gewerke')
  revalidatePath('/preislisten')
  return { ok: true }
}

export async function deleteGewerkIfEmpty(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { count, error: cErr } = await supabase
    .from('preislisten')
    .select('id', { count: 'exact', head: true })
    .eq('gewerk_id', id)
  if (cErr) return { ok: false, message: cErr.message }
  if ((count ?? 0) > 0) {
    return { ok: false, message: 'Gewerk hat noch Leistungen in der Preisliste.' }
  }
  const { error } = await supabase.from('gewerke').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/gewerke')
  revalidatePath('/preislisten')
  return { ok: true }
}

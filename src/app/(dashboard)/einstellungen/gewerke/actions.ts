'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export type GewerkMitCount = {
  id: string
  name: string
  slug: string
  aktiv: boolean
  sort_order: number
  anzahl_leistungen: number
}

export async function loadGewerkeEinstellungen(): Promise<GewerkMitCount[]> {
  const supabase = createClient()
  const { data: gewerke, error } = await supabase
    .from('gewerke')
    .select('id, name, slug, aktiv, sort_order')
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
  return (gewerke ?? []).map((g) => ({
    ...(g as GewerkMitCount),
    anzahl_leistungen: counts.get((g as { id: string }).id) ?? 0,
  }))
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

'use server'

import { logDbError } from '@/lib/errors/log-db-error'
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
  if (error) logDbError('app/einstellungen/gewerke/actions:gewerke', error)
  if (error) {
    console.warn('loadGewerkeEinstellungen', error.message)
    return []
  }
  const { data: pl, error: error2 } = await supabase.from('preislisten').select('gewerk_id')
  if (error2) logDbError('app/einstellungen/gewerke/actions:preislisten', error2)
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

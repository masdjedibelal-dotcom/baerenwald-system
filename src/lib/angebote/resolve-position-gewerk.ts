import type { SupabaseClient } from '@supabase/supabase-js'
import {
  istFreitextPosition,
  istGesamtrabattPosition,
  istGewerkBeschreibungPosition,
} from '@/lib/dokument-zeilen'
import type { AngebotPosition, Gewerk } from '@/lib/types'

function normName(s: string): string {
  return s.trim().toLowerCase()
}

export function resolveGewerkFromHints(
  gewerke: Gewerk[],
  hint: {
    gewerk_id?: string | null
    gewerk_slug?: string | null
    gewerk_name?: string | null
  }
): Gewerk | undefined {
  const id = hint.gewerk_id?.trim()
  if (id) {
    const byId = gewerke.find((g) => g.id === id)
    if (byId) return byId
  }

  const slug = hint.gewerk_slug?.trim()
  if (slug && slug !== 'frei' && !slug.startsWith('__')) {
    const bySlug =
      gewerke.find((g) => g.slug === slug && g.aktiv !== false) ??
      gewerke.find((g) => g.slug === slug)
    if (bySlug) return bySlug
  }

  const name = hint.gewerk_name?.trim()
  if (name) {
    const n = normName(name)
    const byName =
      gewerke.find((g) => g.aktiv !== false && normName(g.name) === n) ??
      gewerke.find((g) => normName(g.name) === n)
    if (byName) return byName
  }

  return undefined
}

export function withResolvedGewerkMeta<T extends {
  gewerk_id?: string
  gewerk_slug?: string
  gewerk_name?: string
}>(item: T, gewerke: Gewerk[]): T {
  const g = resolveGewerkFromHints(gewerke, item)
  if (!g) return item
  return {
    ...item,
    gewerk_id: g.id,
    gewerk_name: item.gewerk_name?.trim() || g.name,
    gewerk_slug: item.gewerk_slug?.trim() || g.slug,
  }
}

export function repairAngebotPositionGewerke(
  positionen: AngebotPosition[],
  gewerke: Gewerk[]
): AngebotPosition[] {
  return positionen.map((p) => {
    if (istGewerkBeschreibungPosition(p) || istFreitextPosition(p) || istGesamtrabattPosition(p)) {
      return p
    }
    return withResolvedGewerkMeta(p, gewerke)
  })
}

async function batchLookupGewerkIdsByLeistungId(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
  const map = new Map<string, string>()
  if (!unique.length) return map

  const [{ data: plRows }, { data: kvRows }] = await Promise.all([
    supabase.from('preislisten').select('id, gewerk_id').in('id', unique),
    supabase
      .from('katalog_varianten')
      .select('id, katalog_positionen(gewerk_id)')
      .in('id', unique),
  ])

  for (const row of plRows ?? []) {
    const gid = String(row.gewerk_id ?? '').trim()
    if (gid) map.set(String(row.id), gid)
  }

  for (const row of kvRows ?? []) {
    const raw = row.katalog_positionen as
      | { gewerk_id?: string | null }
      | { gewerk_id?: string | null }[]
      | null
    const kp = Array.isArray(raw) ? raw[0] : raw
    const gid = String(kp?.gewerk_id ?? '').trim()
    if (gid) map.set(String(row.id), gid)
  }

  return map
}

/** Gewerk-IDs nachziehen (Name/Slug/Katalog/Preisliste) — z. B. vor Handwerker-Zuweisung. */
export async function resolveGewerkForAngebotPositionen(
  supabase: SupabaseClient,
  positionen: AngebotPosition[],
  gewerke: Gewerk[]
): Promise<AngebotPosition[]> {
  let resolved = repairAngebotPositionGewerke(positionen, gewerke)

  const lookupIds = resolved
    .filter((p) => !p.gewerk_id?.trim())
    .filter((p) => !istGewerkBeschreibungPosition(p) && !istFreitextPosition(p) && !istGesamtrabattPosition(p))
    .map((p) => (p.variante_id || p.leistung_id)?.trim())
    .filter((id): id is string => Boolean(id))

  if (!lookupIds.length) return resolved

  const byLeistungId = await batchLookupGewerkIdsByLeistungId(supabase, lookupIds)
  if (!byLeistungId.size) return resolved

  resolved = resolved.map((p) => {
    if (p.gewerk_id?.trim()) return p
    if (istGewerkBeschreibungPosition(p) || istFreitextPosition(p) || istGesamtrabattPosition(p)) {
      return p
    }
    const lid = (p.variante_id || p.leistung_id)?.trim()
    if (!lid) return p
    const gid = byLeistungId.get(lid)
    if (!gid) return p
    return withResolvedGewerkMeta({ ...p, gewerk_id: gid }, gewerke)
  })

  return resolved
}

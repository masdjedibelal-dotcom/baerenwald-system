import 'server-only'

import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  isMangelOffen,
  normalizeMaengel,
  punchListStatusFromMangel,
} from '@/lib/auftraege/abnahme-maengel-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function resolveGewerkIdByName(gewerkName: string): Promise<string | null> {
  const name = gewerkName.trim()
  if (!name) return null
  const { data } = await supabaseAdmin.from('gewerke').select('id, name').ilike('name', name).limit(1)
  const row = data?.[0] as { id: string } | undefined
  if (row?.id) return row.id
  const { data: all } = await supabaseAdmin.from('gewerke').select('id, name').limit(200)
  const hit = (all ?? []).find(
    (g) => String((g as { name?: string }).name ?? '').toLowerCase() === name.toLowerCase()
  ) as { id: string } | undefined
  return hit?.id ?? null
}

async function resolveHandwerkerForPunkt(
  auftragId: string,
  punkt: AbnahmePunkt
): Promise<string | null> {
  const leistungId = punkt.leistung_id?.trim()
  if (!leistungId) return null
  const { data } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id, leistung_name, handwerker_id')
    .eq('auftrag_id', auftragId)
  const rows = (data ?? []) as { id: string; leistung_name?: string | null; handwerker_id?: string | null }[]
  const hit =
    rows.find((r) => r.id === leistungId) ??
    rows.find((r) => r.leistung_name?.trim() === punkt.leistung_name?.trim())
  return hit?.handwerker_id ?? null
}

/** Punch-List aus Abnahme-Mängeln synchronisieren (operatives Nacharbeits-Board). */
export async function syncPunchListFromAbnahmeMaengel(input: {
  auftragId: string
  protokollId: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
}): Promise<void> {
  const maengel = normalizeMaengel(input.maengel)
  const punktById = new Map(input.punkte.map((p) => [p.id, p]))
  const activeIds = new Set(maengel.map((m) => m.punkt_id))

  const { data: existing } = await supabaseAdmin
    .from('punch_list')
    .select('id, abnahme_punkt_id, status')
    .eq('auftrag_id', input.auftragId)
    .not('abnahme_punkt_id', 'is', null)

  for (const row of existing ?? []) {
    const pid = String((row as { abnahme_punkt_id?: string }).abnahme_punkt_id ?? '')
    if (pid && !activeIds.has(pid)) {
      await supabaseAdmin.from('punch_list').delete().eq('id', (row as { id: string }).id)
    }
  }

  for (const m of maengel) {
    const punkt = punktById.get(m.punkt_id)
    const gewerkId = punkt?.gewerk ? await resolveGewerkIdByName(punkt.gewerk) : null
    const hwId =
      m.handwerker_id ??
      (punkt ? await resolveHandwerkerForPunkt(input.auftragId, punkt) : null) ??
      null

    const patch = {
      auftrag_id: input.auftragId,
      protokoll_id: input.protokollId,
      abnahme_punkt_id: m.punkt_id,
      beschreibung: m.beschreibung,
      status: punchListStatusFromMangel(m.status),
      foto_urls: m.foto_urls ?? [],
      foto_nachher_urls: m.foto_nachher_urls ?? [],
      gewerk_id: gewerkId,
      behoben_at: m.behoben_at ?? (m.status === 'behoben' || m.status === 'abgenommen' ? new Date().toISOString() : null),
      behoben_von: m.status === 'behoben' || m.status === 'abgenommen' ? hwId : null,
      prioritaet: isMangelOffen(m) ? 'normal' : 'niedrig',
    }

    const hit = (existing ?? []).find(
      (r) => String((r as { abnahme_punkt_id?: string }).abnahme_punkt_id) === m.punkt_id
    ) as { id: string } | undefined

    if (hit?.id) {
      await supabaseAdmin.from('punch_list').update(patch).eq('id', hit.id)
    } else {
      await supabaseAdmin.from('punch_list').insert(patch)
    }
  }
}

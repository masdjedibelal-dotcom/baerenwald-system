import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { KI_BEREICH_ORDER } from '@/lib/ki/constants'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'

export async function loadKiClusterAnalysen(): Promise<KiClusterAnalyseRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ki_cluster_analysen')
    .select('*')
    .order('bereich', { ascending: true })
    .order('generiert_am', { ascending: false })

  if (error) {
    console.error('loadKiClusterAnalysen', error.message)
    return []
  }

  return latestAnalysenPerBereich((data ?? []) as KiClusterAnalyseRow[])
}

/** Pro Bereich nur die neueste Zeile (keine Doppel-Cards). */
export function latestAnalysenPerBereich(rows: KiClusterAnalyseRow[]): KiClusterAnalyseRow[] {
  const byBereich = new Map<string, KiClusterAnalyseRow>()
  for (const row of rows) {
    const existing = byBereich.get(row.bereich)
    if (!existing || new Date(row.generiert_am) > new Date(existing.generiert_am)) {
      byBereich.set(row.bereich, row)
    }
  }
  return KI_BEREICH_ORDER.filter((b) => byBereich.has(b)).map((b) => byBereich.get(b)!)
}

export function groupAnalysenByBereich(
  rows: KiClusterAnalyseRow[]
): Map<string, KiClusterAnalyseRow[]> {
  const map = new Map<string, KiClusterAnalyseRow[]>()
  for (const row of rows) {
    const list = map.get(row.bereich) ?? []
    list.push(row)
    map.set(row.bereich, list)
  }
  return map
}

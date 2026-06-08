import 'server-only'

import { createClient } from '@/lib/supabase-server'
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

  return (data ?? []) as KiClusterAnalyseRow[]
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

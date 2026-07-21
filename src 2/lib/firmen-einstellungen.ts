import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'

export async function fetchFirmenEinstellungen(
  supabase: SupabaseClient
): Promise<FirmenEinstellungen> {
  const merged = defaultFirmenEinstellungen()
  const { data, error } = await supabase.from('einstellungen').select('key, value')
  if (error) return merged
  for (const row of data ?? []) {
    const k = row.key as keyof FirmenEinstellungen
    if (row.value != null && k in merged) merged[k] = String(row.value)
  }
  return merged
}

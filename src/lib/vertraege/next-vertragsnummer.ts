import type { SupabaseClient } from '@supabase/supabase-js'
import type { HandwerkerVertragTyp } from '@/lib/vertraege/types'

export function vertragsnummerPrefix(typ: HandwerkerVertragTyp, jahr = new Date().getFullYear()): string {
  const y = String(jahr)
  return typ === 'rahmen' ? `RV-${y}-` : `NU-${y}-`
}

export async function nextVertragsnummer(
  supabase: SupabaseClient,
  typ: HandwerkerVertragTyp
): Promise<string> {
  const jahr = new Date().getFullYear()
  const prefix = vertragsnummerPrefix(typ, jahr)

  const { data } = await supabase
    .from('handwerker_vertraege')
    .select('vertrags_nr')
    .like('vertrags_nr', `${prefix}%`)
    .order('vertrags_nr', { ascending: false })
    .limit(50)

  let max = 0
  for (const row of data ?? []) {
    const nr = String(row.vertrags_nr ?? '')
    if (!nr.startsWith(prefix)) continue
    const suffix = parseInt(nr.slice(prefix.length), 10)
    if (Number.isFinite(suffix) && suffix > max) max = suffix
  }

  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

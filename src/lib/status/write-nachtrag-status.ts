/**
 * Status-Writes für nachtraege (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { nowIso } from '@/lib/status/write-helpers'

export function planNachtragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): Record<string, unknown> {
  return { status, updated_at: nowIso(now), ...extra }
}

export async function writeNachtragStatus(
  supabase: SupabaseClient,
  nachtragId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planNachtragStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('nachtraege').update(patch).eq('id', nachtragId)
}

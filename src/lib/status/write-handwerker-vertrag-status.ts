/**
 * Status-Writes für handwerker_vertraege (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { nowIso } from '@/lib/status/write-helpers'

export function planHandwerkerVertragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): Record<string, unknown> {
  return { status, updated_at: nowIso(now), ...extra }
}

export async function writeHandwerkerVertragStatus(
  supabase: SupabaseClient,
  vertragId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planHandwerkerVertragStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('handwerker_vertraege').update(patch).eq('id', vertragId)
}

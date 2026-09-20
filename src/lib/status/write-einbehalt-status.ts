/**
 * Status-Writes für einbehalte (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planEinbehaltStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writeEinbehaltStatus(
  supabase: SupabaseClient,
  einbehaltId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planEinbehaltStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('einbehalte').update(patch).eq('id', einbehaltId)
}

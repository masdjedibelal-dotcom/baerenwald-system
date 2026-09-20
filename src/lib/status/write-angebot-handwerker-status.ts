/**
 * Status-Writes für angebot_handwerker (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planAngebotHandwerkerStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writeAngebotHandwerkerStatus(
  supabase: SupabaseClient,
  rowId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAngebotHandwerkerStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('angebot_handwerker').update(patch).eq('id', rowId)
}

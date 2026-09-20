/**
 * Status-Writes für auftrag_handwerker (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planAuftragHandwerkerStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writeAuftragHandwerkerStatus(
  supabase: SupabaseClient,
  rowId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAuftragHandwerkerStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('auftrag_handwerker').update(patch).eq('id', rowId)
}

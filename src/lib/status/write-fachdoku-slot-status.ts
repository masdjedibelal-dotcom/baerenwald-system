/**
 * Status-Writes für auftrag_fachdoku_slots (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function planFachdokuSlotStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { status, ...extra }
}

export async function writeFachdokuSlotStatus(
  supabase: SupabaseClient,
  slotId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planFachdokuSlotStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('auftrag_fachdoku_slots').update(patch).eq('id', slotId)
}

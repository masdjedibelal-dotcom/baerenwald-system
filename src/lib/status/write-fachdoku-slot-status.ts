/**
 * Status-Writes für auftrag_fachdoku_slots (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: Upsert `offen` (fachdoku-actions); planFachdokuSlotStatusWrite `erledigt` (Upload).
 */
export const FACHDOKU_SLOT_WRITE_STATUSES = ['offen', 'erledigt'] as const

export type FachdokuSlotWriteStatus = (typeof FACHDOKU_SLOT_WRITE_STATUSES)[number]

export function planFachdokuSlotStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('fachdoku_slot', key, FACHDOKU_SLOT_WRITE_STATUSES)
  return { status: key, ...extra }
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

/**
 * Status-Writes für einbehalte (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: Insert `einbehalten`; planEinbehaltStatusWrite `buergschaft`/`freigegeben`
 * (auftraege-finanz-actions). Typ EinbehaltStatus.
 *
 * Mehrdeutig: `freigegeben` = Einbehalt freigegeben (≠ HV-Org-Freigabe / Partner-Dokument).
 */
export const EINBEHALT_WRITE_STATUSES = [
  'einbehalten',
  'buergschaft',
  'freigegeben',
] as const

export type EinbehaltWriteStatus = (typeof EINBEHALT_WRITE_STATUSES)[number]

export function planEinbehaltStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('einbehalt', key, EINBEHALT_WRITE_STATUSES)
  return { status: key, ...extra }
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

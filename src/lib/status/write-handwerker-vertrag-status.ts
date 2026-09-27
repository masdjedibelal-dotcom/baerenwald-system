/**
 * Status-Writes für handwerker_vertraege (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus, nowIso } from '@/lib/status/write-helpers'

/**
 * Herkunft: HandwerkerVertragStatus + Inserts `entwurf`;
 * persist-vertrag-pdf `pdf_erzeugt`; portal-projektvertrag `unterschrieben`.
 * `signiert` nur Lesepfad/Alias — nicht schreibbar.
 */
export const HANDWERKER_VERTRAG_WRITE_STATUSES = [
  'entwurf',
  'pdf_erzeugt',
  'unterschrieben',
] as const

export type HandwerkerVertragWriteStatus =
  (typeof HANDWERKER_VERTRAG_WRITE_STATUSES)[number]

export function planHandwerkerVertragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('handwerker_vertrag', key, HANDWERKER_VERTRAG_WRITE_STATUSES)
  return { status: key, updated_at: nowIso(now), ...extra }
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

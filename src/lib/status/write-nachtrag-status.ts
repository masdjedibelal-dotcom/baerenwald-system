/**
 * Status-Writes für nachtraege (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: planNachtragStatusWrite(`akzeptiert`/`gesendet`);
 * writeNachtragStatus(`genehmigt` Org-Freigabe).
 * `entwurf` nur per Insert (nicht über diesen Helfer).
 * `abgelehnt` nur Lesepfad — nie geschrieben.
 *
 * Mehrdeutig: `akzeptiert` = Kundenbestätigung Nachtrag
 * (≠ Partner-Zuweisung `akzeptiert`).
 */
export const NACHTRAG_WRITE_STATUSES = [
  'akzeptiert',
  'gesendet',
  'genehmigt',
] as const

export type NachtragWriteStatus = (typeof NACHTRAG_WRITE_STATUSES)[number]

export function planNachtragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  _now = new Date()
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('nachtrag', key, NACHTRAG_WRITE_STATUSES)
  return { status: key, ...extra }
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

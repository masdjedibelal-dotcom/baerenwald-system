/**
 * Status-Writes für angebot_handwerker (P2-5).
 * Partner-Zuweisung am Angebot — nicht Kundenannahme (angebote.status).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: Inserts `ausstehend`; send-handwerker-anfrage `angefragt`;
 * handwerker-annahme `akzeptiert`/`abgelehnt`; CRM `akzeptiert`; Replace `ersetzt`.
 *
 * Mehrdeutig: `akzeptiert`/`abgelehnt` = Partner-Antwort auf Anfrage
 * (≠ angebote.status `angenommen` / `abgelehnt`).
 * `ausstehend` = noch nicht angeschrieben (≠ Rechnung).
 */
export const ANGEBOT_HANDWERKER_WRITE_STATUSES = [
  'ausstehend',
  'angefragt',
  'akzeptiert',
  'abgelehnt',
  'ersetzt',
] as const

export type AngebotHandwerkerWriteStatus =
  (typeof ANGEBOT_HANDWERKER_WRITE_STATUSES)[number]

export function planAngebotHandwerkerStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('angebot_handwerker', key, ANGEBOT_HANDWERKER_WRITE_STATUSES)
  return { status: key, ...extra }
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

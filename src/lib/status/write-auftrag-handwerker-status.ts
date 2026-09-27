/**
 * Status-Writes für auftrag_handwerker (P2-5).
 * Partner-Zuweisung am Auftrag — nicht Kundenannahme am Angebot.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: AUFTRAG_HW_STATUS_OPTIONS + Aufrufe plan/write*
 * (handwerker-actions, leistungen-steuerung-v3, sync-angebot-zu-auftrag).
 * `angenommen`/`bestaetigt`/`erledigt` nur Lesepfad (Label) — nicht schreibbar.
 *
 * Mehrdeutig: `akzeptiert`/`abgelehnt` = Partner-Antwort auf Zuweisung
 * (≠ Angebot `angenommen` / Kundenablehnung).
 * `ausstehend` = Zuweisung noch nicht angeschrieben (≠ Rechnung offen).
 */
export const AUFTRAG_HANDWERKER_WRITE_STATUSES = [
  'ausstehend',
  'angefragt',
  'warten',
  'akzeptiert',
  'abgelehnt',
  'zugewiesen',
  'ersetzt',
] as const

export type AuftragHandwerkerWriteStatus =
  (typeof AUFTRAG_HANDWERKER_WRITE_STATUSES)[number]

export function planAuftragHandwerkerStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('auftrag_handwerker', key, AUFTRAG_HANDWERKER_WRITE_STATUSES)
  return { status: key, ...extra }
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

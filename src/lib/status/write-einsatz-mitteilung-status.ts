/**
 * Einziger Schreibpfad für einsatz_mitteilungen.status (Umbau P13).
 * offen → uebernommen (Regie als Position) | erledigt (zur Kenntnis / verworfen).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

export const EINSATZ_MITTEILUNG_WRITE_STATUSES = ['offen', 'uebernommen', 'erledigt'] as const
export type EinsatzMitteilungStatus = (typeof EINSATZ_MITTEILUNG_WRITE_STATUSES)[number]

/** Setzt den Status nur, wenn die Mitteilung noch offen ist. Liefert die betroffenen Zeilen. */
export async function writeEinsatzMitteilungStatus(
  db: SupabaseClient,
  mitteilungId: string,
  status: EinsatzMitteilungStatus,
  extra: Record<string, unknown> = {}
) {
  assertKnownStatus('einsatz_mitteilung', status, EINSATZ_MITTEILUNG_WRITE_STATUSES)
  return db
    .from('einsatz_mitteilungen')
    .update({ ...extra, status, erledigt_at: new Date().toISOString() })
    .eq('id', mitteilungId)
    .eq('status', 'offen')
    .select('auftrag_id')
}

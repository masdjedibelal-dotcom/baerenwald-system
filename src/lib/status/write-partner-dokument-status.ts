/**
 * Status-Writes für partner_dokumente (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: planPartnerDokumentStatusWrite `freigegeben`/`abgelehnt` (handwerker/actions);
 * Insert CRM `freigegeben`.
 * `in_pruefung`/`eingereicht`/`hochgeladen`/`geloescht`/`genehmigt` nur Lesepfad
 * (partner-dokument-status.ts) — nicht über diesen Helfer geschrieben.
 *
 * Mehrdeutig: `abgelehnt` = Compliance-Dokument abgelehnt (≠ Angebot/Partner-Zuweisung).
 * `freigegeben` = Dokument freigegeben (≠ Einbehalt/HV).
 */
export const PARTNER_DOKUMENT_WRITE_STATUSES = ['freigegeben', 'abgelehnt'] as const

export type PartnerDokumentWriteStatus =
  (typeof PARTNER_DOKUMENT_WRITE_STATUSES)[number]

export function planPartnerDokumentStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus('partner_dokument', key, PARTNER_DOKUMENT_WRITE_STATUSES)
  return { status: key, ...extra }
}

export async function writePartnerDokumentStatus(
  supabase: SupabaseClient,
  dokumentId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planPartnerDokumentStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('partner_dokumente').update(patch).eq('id', dokumentId)
}

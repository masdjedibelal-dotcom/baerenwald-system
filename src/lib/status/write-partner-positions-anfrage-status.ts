/**
 * Status-Writes für partner_positions_anfragen (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Herkunft: decidePartnerPositionsAnfrage* → `intern` / `nachtrag` / `abgelehnt`.
 *
 * Mehrdeutig: `abgelehnt` = CRM lehnt Partner-Positions-Anfrage ab
 * (≠ Angebot / Partner-Zuweisung / Dokument).
 */
export const PARTNER_POSITIONS_ANFRAGE_WRITE_STATUSES = [
  'intern',
  'nachtrag',
  'abgelehnt',
] as const

export type PartnerPositionsAnfrageWriteStatus =
  (typeof PARTNER_POSITIONS_ANFRAGE_WRITE_STATUSES)[number]

export function planPartnerPositionsAnfrageStatusWrite(
  status: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const key = status.trim().toLowerCase()
  assertKnownStatus(
    'partner_positions_anfrage',
    key,
    PARTNER_POSITIONS_ANFRAGE_WRITE_STATUSES
  )
  return { status: key, ...extra }
}

export async function writePartnerPositionsAnfrageStatus(
  supabase: SupabaseClient,
  anfrageId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planPartnerPositionsAnfrageStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('partner_positions_anfragen').update(patch).eq('id', anfrageId)
}

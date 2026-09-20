/**
 * Einziger erlaubter Schreibpfad für auftraege.status (P2-5).
 */
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assertKnownStatus,
  buildStatusPatch,
  isStornoStatus,
  type StatusWritePatch,
} from '@/lib/status/write-helpers'

export const AUFTRAG_WRITE_STATUSES = [
  'offen',
  'in_arbeit',
  'abnahme',
  'abgeschlossen',
  'storniert',
] as const

export type AuftragWriteStatus = (typeof AUFTRAG_WRITE_STATUSES)[number]

export function planAuftragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  const key = status.trim().toLowerCase()
  assertKnownStatus('auftrag', key, AUFTRAG_WRITE_STATUSES)
  return buildStatusPatch(key, extra, now)
}

/** Abnahme-Übergang: offen|in_arbeit → abnahme. */
export function planAbnahmeWrite(
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  return planAuftragStatusWrite('abnahme', extra, now)
}

export async function writeAuftragStatus(
  supabase: SupabaseClient,
  auftragId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAuftragStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('auftraege').update(patch).eq('id', auftragId)
}

export function canStornoAuftrag(fromStatus: string): boolean {
  return !isStornoStatus(fromStatus)
}

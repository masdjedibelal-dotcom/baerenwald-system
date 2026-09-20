/**
 * Einziger erlaubter Schreibpfad für rechnungen.status (P2-5).
 */
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assertKnownStatus,
  buildStatusPatch,
  isStornoStatus,
  type StatusWritePatch,
} from '@/lib/status/write-helpers'

export const RECHNUNG_WRITE_STATUSES = [
  'ausstehend',
  'entwurf',
  'gesendet',
  'bezahlt',
  'storniert',
  'korrektur_entwurf',
  'korrektur_gespeichert',
  'korrektur_versendet',
  'ueberfaellig',
  'ueberwiesen',
] as const

export type RechnungWriteStatus = (typeof RECHNUNG_WRITE_STATUSES)[number]

export function planRechnungStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  const key = status.trim().toLowerCase()
  assertKnownStatus('rechnung', key, RECHNUNG_WRITE_STATUSES)
  return buildStatusPatch(key, extra, now)
}

export function planRechnungBezahltWrite(
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  return planRechnungStatusWrite('bezahlt', extra, now)
}

export function planRechnungStornoWrite(
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  return planRechnungStatusWrite('storniert', extra, now)
}

export async function writeRechnungStatus(
  supabase: SupabaseClient,
  rechnungId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planRechnungStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('rechnungen').update(patch).eq('id', rechnungId)
}

export function canStornoRechnung(fromStatus: string): boolean {
  return !isStornoStatus(fromStatus)
}

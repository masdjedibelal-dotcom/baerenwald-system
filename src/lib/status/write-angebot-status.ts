/**
 * Einziger erlaubter Schreibpfad für angebote.status / status_einfach (P2-5).
 */
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assertKnownStatus,
  buildStatusPatch,
  isStornoStatus,
  type StatusWritePatch,
} from '@/lib/status/write-helpers'

export const ANGEBOT_WRITE_STATUSES = [
  'entwurf',
  'gesendet_handwerker',
  'handwerker_akzeptiert',
  'gesendet_kunde',
  'gesendet',
  'angenommen',
  'kunde_akzeptiert',
  'abgelehnt',
  'abgelaufen',
  'ersetzt',
  'storniert',
] as const

export type AngebotWriteStatus = (typeof ANGEBOT_WRITE_STATUSES)[number]

/** Partner-Annahme: UI „Angenommen“ — DB handwerker_akzeptiert / angenommen. */
export const PARTNER_ANNAHME_STATUSES = [
  'handwerker_akzeptiert',
  'angenommen',
  'kunde_akzeptiert',
] as const

export function planAngebotStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  const key = status.trim().toLowerCase()
  assertKnownStatus('angebot', key, ANGEBOT_WRITE_STATUSES)
  return buildStatusPatch(key, extra, now)
}

export function planAngebotEinfachWrite(
  statusEinfach: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): Record<string, unknown> {
  const key = statusEinfach.trim().toLowerCase()
  assertKnownStatus('angebot_einfach', key, ANGEBOT_WRITE_STATUSES)
  return {
    status_einfach: key,
    updated_at: now.toISOString(),
    ...extra,
  }
}

export function planPartnerAnnahmeWrite(
  variant: 'handwerker_akzeptiert' | 'angenommen' = 'handwerker_akzeptiert',
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  return planAngebotStatusWrite(variant, extra, now)
}

export async function writeAngebotStatus(
  supabase: SupabaseClient,
  angebotId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAngebotStatusWrite(status, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('angebote').update(patch).eq('id', angebotId)
}

export async function writeAngebotStatusEinfach(
  supabase: SupabaseClient,
  angebotId: string,
  statusEinfach: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAngebotEinfachWrite(statusEinfach, extra)
  // bewusst ignoriert: Query-Builder, Error am Call-Site
  return supabase.from('angebote').update(patch).eq('id', angebotId)
}

export function canStornoAngebot(fromStatus: string): boolean {
  return !isStornoStatus(fromStatus)
}

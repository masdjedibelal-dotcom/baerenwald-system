import type { SupabaseClient } from '@supabase/supabase-js'

import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Zustellstatus ausgehender WhatsApp-Nachrichten (StatusCallback von Twilio):
 * gesendet → zugestellt → gelesen, oder fehler. Nie zurück (spätere Meldung kann früher ankommen).
 */
export const WHATSAPP_WRITE_STATUSES = ['gesendet', 'zugestellt', 'gelesen', 'fehler'] as const
export type WhatsAppZustellStatus = (typeof WHATSAPP_WRITE_STATUSES)[number]

const RANG: Record<WhatsAppZustellStatus, number> = { gesendet: 1, zugestellt: 2, gelesen: 3, fehler: 4 }

export async function writeWhatsAppStatus(
  db: SupabaseClient,
  input: { waId: string; status: WhatsAppZustellStatus; fehler: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertKnownStatus('whatsapp', input.status, WHATSAPP_WRITE_STATUSES)
  const schwaecher = WHATSAPP_WRITE_STATUSES.filter((s) => RANG[s] < RANG[input.status])
  const { error } = await db
    .from('whatsapp_nachrichten')
    .update({ status: input.status, fehler: input.fehler })
    .eq('wa_id', input.waId)
    .eq('richtung', 'aus')
    .in('status', ['wartend', ...schwaecher])
  return error ? { ok: false, error: error.message } : { ok: true }
}

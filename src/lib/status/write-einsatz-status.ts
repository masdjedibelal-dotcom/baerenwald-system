import type { SupabaseClient } from '@supabase/supabase-js'

import { planAuftragStatusWrite } from '@/lib/status/write-auftrag-status'
import { assertKnownStatus } from '@/lib/status/write-helpers'

/**
 * Einsatz-Status (Umbau P11/P12): gesendet → angenommen | abgelehnt, angenommen → fertig.
 * Eine Wahrheit für Portal (Partner klickt selbst) und CRM (Bärenwald trägt für ihn ein).
 * Schreibt nur, wenn der bisherige Status noch stimmt (kein Überschreiben bei Doppelklick).
 */
export const EINSATZ_WRITE_STATUSES = ['gesendet', 'angenommen', 'abgelehnt', 'fertig'] as const
/** @deprecated Alias */
export const EINSATZ_STATUSES = EINSATZ_WRITE_STATUSES
export type EinsatzStatus = (typeof EINSATZ_WRITE_STATUSES)[number]

/** Wer den Schritt erfasst hat: der Partner selbst oder Bärenwald (nach Telefon/WhatsApp). */
export type EinsatzErfasstVon = 'partner' | 'bw'

const UEBERGAENGE: Record<EinsatzStatus, EinsatzStatus[]> = {
  gesendet: ['angenommen', 'abgelehnt'],
  angenommen: ['fertig'],
  abgelehnt: [],
  fertig: [],
}

export function einsatzUebergangErlaubt(von: string, nach: EinsatzStatus): boolean {
  return (UEBERGAENGE[von as EinsatzStatus] ?? []).includes(nach)
}

export async function writeEinsatzStatus(
  db: SupabaseClient,
  input: {
    einsatzId: string
    /** Partner-Portal: nur eigene Einsätze. CRM: weglassen. */
    handwerkerId?: string
    von: EinsatzStatus
    nach: EinsatzStatus
    extra?: Record<string, unknown>
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertKnownStatus('einsatz', input.nach, EINSATZ_WRITE_STATUSES)
  if (!einsatzUebergangErlaubt(input.von, input.nach)) {
    return { ok: false, error: 'Dieser Schritt ist im aktuellen Stand nicht möglich.' }
  }
  const now = new Date().toISOString()
  let q = db
    .from('einsaetze')
    .update({ ...(input.extra ?? {}), status: input.nach, updated_at: now })
    .eq('id', input.einsatzId)
    .eq('status', input.von)
  if (input.handwerkerId) q = q.eq('handwerker_id', input.handwerkerId)
  const { data, error } = await q.select('id, auftrag_id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Der Einsatz wurde inzwischen geändert. Bitte neu laden.' }

  // Angenommen → Auftrag läuft (nur aus „offen“; spätere Stände bleiben unberührt)
  const auftragId = String((data[0] as { auftrag_id?: string | null }).auftrag_id ?? '')
  if (input.nach === 'angenommen' && auftragId) {
    await db.from('auftraege').update(planAuftragStatusWrite('in_arbeit')).eq('id', auftragId).eq('status', 'offen')
  }
  return { ok: true }
}

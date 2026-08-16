'use server'

import { ensurePartnerEingangsRechnungVorgang } from '@/lib/rechnungen/ensure-partner-eingangsrechnung-vorgang'
import { revalidatePath } from 'next/cache'

/** Einmalig / manuell: Partner-PDFs als Rechnungs-Vorgänge anlegen. */
export async function syncPartnerEingangsRechnungVorgaenge(): Promise<{
  ok: true
  synced: number
  failed: number
}> {
  const { backfillPartnerEingangsRechnungVorgaenge } = await import(
    '@/lib/rechnungen/ensure-partner-eingangsrechnung-vorgang'
  )
  const r = await backfillPartnerEingangsRechnungVorgaenge()
  revalidatePath('/vorgaenge')
  revalidatePath('/rechnungen')
  return { ok: true, synced: r.ok, failed: r.failed }
}

export async function ensurePartnerEingangsRechnungVorgangAction(
  angebotHandwerkerId: string
): Promise<{ ok: true; rechnungId: string } | { ok: false; message: string }> {
  const r = await ensurePartnerEingangsRechnungVorgang(angebotHandwerkerId)
  if (!r.ok) return { ok: false, message: r.error }
  revalidatePath('/vorgaenge')
  revalidatePath(`/rechnungen/${r.rechnungId}`)
  return { ok: true, rechnungId: r.rechnungId }
}

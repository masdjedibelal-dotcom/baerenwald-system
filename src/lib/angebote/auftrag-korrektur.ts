/**
 * „Auftrag bearbeiten“ (AG-Korrektur): Kontext laden (Auftrag + Rechnungen).
 */
import { logDbError } from '@/lib/errors/log-db-error'
import {
  auftragHatGestellteKundenrechnung,
  type AuftragKorrekturKontext,
} from '@/lib/angebote/auftrag-korrektur-gate'
import type { SupabaseClient } from '@supabase/supabase-js'

export type { AuftragKorrekturKontext, RechnungGateRow } from '@/lib/angebote/auftrag-korrektur-gate'
export {
  auftragDarfKorrektur,
  auftragHatGestellteKundenrechnung,
  auftragKorrekturSperrgrund,
} from '@/lib/angebote/auftrag-korrektur-gate'

/**
 * Eine Wahrheitsquelle für Korrektur-Gate: Auftrag per ID oder über Angebot/Lead finden,
 * dann Rechnungsstand laden.
 */
export async function loadAuftragKorrekturKontext(
  client: SupabaseClient,
  opts: { auftragId?: string | null; angebotId?: string | null }
): Promise<AuftragKorrekturKontext> {
  let auftragId = String(opts.auftragId ?? '').trim() || null
  const angebotId = String(opts.angebotId ?? '').trim() || null

  if (!auftragId && angebotId) {
    const { data: byAng, error } = await client
      .from('auftraege')
      .select('id')
      .eq('angebot_id', angebotId)
      .maybeSingle()
    if (error) logDbError('lib/angebote/auftrag-korrektur:auftraege', error)
    auftragId = byAng?.id ? String(byAng.id) : null

    if (!auftragId) {
      const { data: ang, error: angErr } = await client
        .from('angebote')
        .select('lead_id')
        .eq('id', angebotId)
        .maybeSingle()
      if (angErr) logDbError('lib/angebote/auftrag-korrektur:angebote', angErr)
      const leadId = String(ang?.lead_id ?? '').trim()
      if (leadId) {
        const { data: byLead, error: leadErr } = await client
          .from('auftraege')
          .select('id')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (leadErr) logDbError('lib/angebote/auftrag-korrektur:auftraege', leadErr)
        auftragId = byLead?.id ? String(byLead.id) : null
      }
    }
  }

  if (!auftragId) {
    return { auftragId: null, hatGestellteRechnung: false }
  }

  const { data: rechnungen, error: rErr } = await client
    .from('rechnungen')
    .select('status, richtung, beleg_typ')
    .eq('auftrag_id', auftragId)
  if (rErr) logDbError('lib/angebote/auftrag-korrektur:rechnungen', rErr)

  return {
    auftragId,
    hatGestellteRechnung: auftragHatGestellteKundenrechnung(rechnungen ?? []),
  }
}

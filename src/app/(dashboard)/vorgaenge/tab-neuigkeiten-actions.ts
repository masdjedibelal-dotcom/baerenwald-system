'use server'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Letzte Änderung je Reiter (ISO) — Punkt am Reiter, wenn neuer als „zuletzt angesehen“. */
export type TabNeuigkeiten = Partial<Record<'tagebuch' | 'akte' | 'zahlung', string | null>>

async function maxZeit(tabelle: string, spalte: string, filterSpalte: string, wert: string, extra?: (q: any) => any) {
  let q = supabaseAdmin.from(tabelle).select(spalte).eq(filterSpalte, wert).not(spalte, 'is', null)
  if (extra) q = extra(q)
  const { data, error } = await q.order(spalte, { ascending: false }).limit(1).maybeSingle()
  if (error) logDbError(`vorgaenge/tab-neuigkeiten:${tabelle}`, error)
  return ((data as Record<string, string> | null)?.[spalte] as string | undefined) ?? null
}

function spaeteste(...zeiten: (string | null)[]): string | null {
  return zeiten.filter((z): z is string => Boolean(z)).sort().pop() ?? null
}

export async function ladeTabNeuigkeiten(input: { auftragId?: string | null; leadId?: string | null }): Promise<TabNeuigkeiten> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return {}
  const auftragId = input.auftragId?.trim() || null
  const leadId = input.leadId?.trim() || null

  const [tagebuchPos, tagebuchAlt, baustellenDok, leadDok, mailEin, partnerRechnung] = await Promise.all([
    auftragId ? maxZeit('position_eintraege', 'created_at', 'auftrag_id', auftragId) : null,
    auftragId ? maxZeit('auftrag_bautagebuch_eintraege', 'created_at', 'auftrag_id', auftragId) : null,
    auftragId ? maxZeit('auftrag_baustellen_dokumente', 'created_at', 'auftrag_id', auftragId) : null,
    leadId ? maxZeit('lead_dokumente', 'created_at', 'lead_id', leadId) : null,
    leadId ? maxZeit('email_log', 'created_at', 'lead_id', leadId, (q) => q.eq('richtung', 'empfangen')) : null,
    auftragId ? maxZeit('einsaetze', 'rechnung_eingereicht_at', 'auftrag_id', auftragId) : null,
  ])

  return {
    tagebuch: spaeteste(tagebuchPos, tagebuchAlt),
    akte: spaeteste(baustellenDok, leadDok, mailEin),
    zahlung: partnerRechnung,
  }
}

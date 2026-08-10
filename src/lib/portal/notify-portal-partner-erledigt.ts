/**
 * Shared-DB: HV-Glocke nach CRM-Freigabe des Abnahmeprotokolls
 * (nicht schon bei Partner-Submit).
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

function portalVorgangLink(leadId: string): string {
  return `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}&tab=uebersicht`
}

/**
 * HV: Partner-Leistungen freigegeben / erledigt (nach CRM-Abnahme-Freigabe).
 */
export async function notifyPortalPartnerErledigtFromCrm(input: {
  auftragId: string
  leadId: string | null | undefined
  handwerkerName: string
  leistungen: string[]
  vollstaendig?: boolean
}): Promise<void> {
  const leadId = String(input.leadId ?? '').trim()
  if (!leadId) return

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, auftraggeber_kunde_id, situation, bereiche')
    .eq('id', leadId)
    .maybeSingle()

  if (error) {
    console.warn('[notifyPortalPartnerErledigtFromCrm] lead:', error.message)
    return
  }

  const kundeId = String(lead?.auftraggeber_kunde_id ?? '').trim()
  if (!kundeId) return

  const leistungText =
    input.leistungen.length === 1
      ? input.leistungen[0]
      : input.leistungen.length > 1
        ? `${input.leistungen.length} Leistungen`
        : 'Leistungen'

  const bezug =
    String((lead as { situation?: string | null })?.situation ?? '').trim() || leistungText
  const vollstaendig = input.vollstaendig === true
  const titel = vollstaendig ? `Erledigt: ${bezug}` : `Teilabschluss: ${bezug}`
  const body = vollstaendig
    ? `${input.handwerkerName} — Abnahme freigegeben. Sie können Feedback geben oder Mängel melden.`
    : `${input.handwerkerName} — Teilabnahme freigegeben. Weitere Positionen am Auftrag sind noch offen.`

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recent } = await supabaseAdmin
    .from('hv_notifications')
    .select('id')
    .eq('kunde_id', kundeId)
    .eq('typ', 'handwerker_erledigt')
    .ilike('link', `%${leadId}%`)
    .gte('created_at', since)
    .limit(1)
  if ((recent ?? []).length > 0) return

  const { error: insErr } = await supabaseAdmin.from('hv_notifications').insert({
    kunde_id: kundeId,
    typ: 'handwerker_erledigt',
    titel,
    body,
    link: portalVorgangLink(leadId),
  })
  if (insErr) {
    console.warn('[notifyPortalPartnerErledigtFromCrm] insert:', insErr.message)
  }
}

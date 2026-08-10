/**
 * Shared-DB: HV-Glocke nach Rechnungsversand.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

function portalVorgangLink(leadId: string): string {
  return `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}&tab=dokumente`
}

/**
 * Schreibt hv_notifications für die Org nach „Rechnung gesendet“.
 */
export async function notifyPortalRechnungGesendetFromCrm(input: {
  rechnungId: string
  auftragId?: string | null
  kundeId?: string | null
  rechnungsnummer?: string | null
  brutto?: number | null
}): Promise<void> {
  const rechnungId = input.rechnungId.trim()
  if (!rechnungId) return

  let leadId: string | null = null
  let orgKundeId = String(input.kundeId ?? '').trim() || null
  let titel = 'Auftrag'
  const nr =
    String(input.rechnungsnummer ?? '').trim() ||
    rechnungId.slice(0, 8).toUpperCase()

  const auftragId = String(input.auftragId ?? '').trim()
  if (auftragId) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('id, titel, lead_id, kunde_id')
      .eq('id', auftragId)
      .maybeSingle()
    if (auf) {
      leadId = String(auf.lead_id ?? '').trim() || null
      titel = String(auf.titel ?? '').trim() || titel
      if (!orgKundeId) orgKundeId = String(auf.kunde_id ?? '').trim() || null
    }
  }

  if (leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, auftraggeber_kunde_id, kunde_id')
      .eq('id', leadId)
      .maybeSingle()
    const ag = String(lead?.auftraggeber_kunde_id ?? '').trim()
    if (ag) orgKundeId = ag
    else if (!orgKundeId) {
      orgKundeId = String(lead?.kunde_id ?? '').trim() || null
    }
  }

  if (!orgKundeId) return

  // Nur Organisations-Portal
  const { data: kunde } = await supabaseAdmin
    .from('kunden')
    .select('id, portal_modus')
    .eq('id', orgKundeId)
    .maybeSingle()
  const modus = String(kunde?.portal_modus ?? '')
    .trim()
    .toLowerCase()
  if (modus && modus !== 'organisation') return

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const link = leadId
    ? portalVorgangLink(leadId)
    : `/portal?section=vorgaenge`

  const { data: existing } = await supabaseAdmin
    .from('hv_notifications')
    .select('id')
    .eq('kunde_id', orgKundeId)
    .eq('typ', 'rechnung')
    .ilike('link', leadId ? `%${leadId}%` : `%`)
    .ilike('titel', `%${nr}%`)
    .gte('created_at', since)
    .limit(1)
  if ((existing ?? []).length > 0) return

  const brutto =
    input.brutto != null && Number.isFinite(Number(input.brutto))
      ? Number(input.brutto)
      : null
  const bruttoLabel =
    brutto != null
      ? new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(brutto)
      : null

  const notifTitel = `Rechnung ${nr}`
  const body = bruttoLabel
    ? `Rechnung ${nr} zu „${titel}“ (${bruttoLabel}) liegt im Portal unter Dokumente.`
    : `Rechnung ${nr} zu „${titel}“ liegt im Portal unter Dokumente.`

  const { error } = await supabaseAdmin.from('hv_notifications').insert({
    kunde_id: orgKundeId,
    typ: 'rechnung',
    titel: notifTitel,
    body,
    link,
  })
  if (error) {
    console.warn('[notifyPortalRechnungGesendetFromCrm] hv_notifications:', error.message)
  }
}

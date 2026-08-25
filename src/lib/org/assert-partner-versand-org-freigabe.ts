import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  orgFreigabeBlockiertPartner,
  orgFreigabePartnerBlockMessage,
} from '@/lib/org/org-portal-helpers'
import type { OrgFreigabeStatus } from '@/lib/types'

type LeadFreigabePick = {
  id: string
  org_freigabe_status: string | null
  hv_meldung_status: string | null
}

/**
 * Zentraler Guard vor jedem Partner-Versand (Mail, Portal-Notify, Token-Anfrage).
 * Ausnahme Notmaßnahme: siehe `orgFreigabeBlockiertPartner` / 06-PROZESSE.md.
 */
export async function assertPartnerVersandOrgFreigabe(input: {
  leadId?: string | null
  auftragId?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const lead = await resolveLeadFreigabe(input)
  if (!lead) return { ok: true }

  const status = (lead.org_freigabe_status ?? null) as OrgFreigabeStatus | null
  if (!orgFreigabeBlockiertPartner(status, lead.hv_meldung_status)) {
    return { ok: true }
  }

  return {
    ok: false,
    message: orgFreigabePartnerBlockMessage(status, lead.hv_meldung_status)!,
  }
}

async function resolveLeadFreigabe(input: {
  leadId?: string | null
  auftragId?: string | null
}): Promise<LeadFreigabePick | null> {
  const leadId = input.leadId?.trim() || null
  if (leadId) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select('id, org_freigabe_status, hv_meldung_status')
      .eq('id', leadId)
      .maybeSingle()
    return (data as LeadFreigabePick | null) ?? null
  }

  const auftragId = input.auftragId?.trim() || null
  if (!auftragId) return null

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('lead_id')
    .eq('id', auftragId)
    .maybeSingle()
  const fromAuftrag = (auf as { lead_id?: string | null } | null)?.lead_id?.trim()
  if (!fromAuftrag) return null

  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, org_freigabe_status, hv_meldung_status')
    .eq('id', fromAuftrag)
    .maybeSingle()
  return (data as LeadFreigabePick | null) ?? null
}

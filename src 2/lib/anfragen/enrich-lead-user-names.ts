import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeadDetail } from '@/lib/types'

/** Ersteller-Namen für Notizen/Status-Historie (ohne PostgREST-Embed user_profiles). */
export async function enrichLeadDetailUserNames(
  supabase: SupabaseClient,
  lead: LeadDetail
): Promise<LeadDetail> {
  const userIds = new Set<string>()
  for (const n of lead.lead_notizen ?? []) {
    if (n.erstellt_von) userIds.add(n.erstellt_von)
  }
  for (const h of lead.leads_status_history ?? []) {
    if (h.user_id) userIds.add(h.user_id)
  }
  if (!userIds.size) return lead

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, name')
    .in('id', Array.from(userIds))

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name as string]))

  const lead_notizen = (lead.lead_notizen ?? []).map((n) => ({
    ...n,
    user_profiles: n.erstellt_von
      ? { name: nameById.get(n.erstellt_von)?.trim() || '' }
      : null,
  }))

  const leads_status_history = (lead.leads_status_history ?? []).map((h) => ({
    ...h,
    user_profiles: h.user_id ? { name: nameById.get(h.user_id)?.trim() || '' } : null,
  }))

  return { ...lead, lead_notizen, leads_status_history }
}

import type { SupabaseClient } from '@supabase/supabase-js'

export type OrgDashboardKpis = {
  meldungenWoche: number
  wartetFreigabe: number
  orgPortalLeads: number
}

export async function loadOrgDashboardKpis(
  supabase: SupabaseClient,
  weekStartIso: string
): Promise<OrgDashboardKpis> {
  const [meldungenRes, freigabeRes, orgRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('anlass', 'meldung')
      .gte('created_at', weekStartIso),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_freigabe_status', 'ausstehend'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('kanal', ['org_portal', 'org_funnel', 'org_service', 'hv_melder_link', 'hv_einladung'])
      .gte('created_at', weekStartIso),
  ])

  return {
    meldungenWoche: meldungenRes.count ?? 0,
    wartetFreigabe: freigabeRes.count ?? 0,
    orgPortalLeads: orgRes.count ?? 0,
  }
}

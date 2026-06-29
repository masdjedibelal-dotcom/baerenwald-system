import type { SupabaseClient } from '@supabase/supabase-js'
import { leadKundeEmbed } from '@/lib/supabase/lead-kunde-embed'
import { enrichLeadDetailUserNames } from '@/lib/anfragen/enrich-lead-user-names'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import type {
  KundenObjekt,
  LeadAuftraggeberEmbed,
  LeadDetail,
  LeadDokumentRow,
  LeadTimelineRow,
  OrgFreigabeLogRow,
} from '@/lib/types'

const SELECT_FULL = `
  *,
  ${leadKundeEmbed('*')},
  angebote(
    id,
    status,
    status_einfach,
    gesamt_fix,
    gesamt_min,
    gesamt_max,
    positionen,
    created_at,
    angebotsnr,
    pdf_url,
    gesendet_am,
    gesendet_kunde_at
  ),
  leads_status_history(*),
  kalender_termine(*),
  lead_notizen(*)
`

const SELECT_WITHOUT_ANGEBOTE = `
  *,
  ${leadKundeEmbed('*')},
  leads_status_history(*),
  kalender_termine(*),
  lead_notizen(*)
`

const SELECT_MINIMAL = `
  *,
  ${leadKundeEmbed('*')}
`

async function loadLeadTimelineOptional(
  supabase: SupabaseClient,
  leadId: string
): Promise<LeadTimelineRow[]> {
  const { data, error } = await supabase
    .from('lead_timeline')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) {
    // Tabelle fehlt lokal / Migration nicht angewendet — Detailseite soll trotzdem öffnen.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[load-anfrage-detail] lead_timeline:', error.message)
    }
    return []
  }
  return (data ?? []) as LeadTimelineRow[]
}

async function loadLeadDokumenteOptional(
  supabase: SupabaseClient,
  leadId: string
): Promise<LeadDokumentRow[]> {
  const { data, error } = await supabase
    .from('lead_dokumente')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[load-anfrage-detail] lead_dokumente:', error.message)
    }
    return []
  }
  return (data ?? []) as LeadDokumentRow[]
}

async function loadLeadOrgKontextOptional(
  supabase: SupabaseClient,
  lead: LeadDetail
): Promise<Pick<LeadDetail, 'auftraggeber' | 'kunden_objekte' | 'org_freigabe_log'>> {
  const out: Pick<LeadDetail, 'auftraggeber' | 'kunden_objekte' | 'org_freigabe_log'> = {}

  if (lead.auftraggeber_kunde_id) {
    const { data } = await supabase
      .from('kunden')
      .select('id, name, email, org_anzeigename, org_kennung')
      .eq('id', lead.auftraggeber_kunde_id)
      .maybeSingle()
    if (data) out.auftraggeber = data as LeadAuftraggeberEmbed
  }

  if (lead.kunde_objekt_id) {
    const { data } = await supabase
      .from('kunden_objekte')
      .select('*')
      .eq('id', lead.kunde_objekt_id)
      .maybeSingle()
    if (data) out.kunden_objekte = data as KundenObjekt
  }

  const { data: logRows } = await supabase
    .from('org_freigabe_log')
    .select('*')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (logRows?.length) out.org_freigabe_log = logRows as OrgFreigabeLogRow[]

  return out
}

/** Lädt eine Anfrage für die Detailseite; fehlende Relationen (z. B. lead_timeline) brechen nicht ab. */
export async function loadAnfrageDetail(
  supabase: SupabaseClient,
  id: string
): Promise<LeadDetail | null> {
  const leadId = id?.trim()
  if (!leadId) return null

  const selects = [SELECT_FULL, SELECT_WITHOUT_ANGEBOTE, SELECT_MINIMAL]

  for (const select of selects) {
    const { data, error } = await withCrmReadFallback(async (db) =>
      db.from('leads').select(select).eq('id', leadId).maybeSingle()
    )
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[load-anfrage-detail] select fallback:', error.message)
      }
      continue
    }
    if (!data) continue

    let lead = data as unknown as LeadDetail
    const kunde = resolveLeadKunde(lead.kunden as LeadDetail['kunden'])
    if (kunde) lead = { ...lead, kunden: kunde }
    const [timeline, dokumente, orgKontext] = await Promise.all([
      loadLeadTimelineOptional(supabase, leadId),
      loadLeadDokumenteOptional(supabase, leadId),
      loadLeadOrgKontextOptional(supabase, lead),
    ])
    lead = { ...lead, lead_timeline: timeline, lead_dokumente: dokumente, ...orgKontext }
    return enrichLeadDetailUserNames(supabase, lead)
  }

  return null
}

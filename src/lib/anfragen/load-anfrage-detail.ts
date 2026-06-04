import type { SupabaseClient } from '@supabase/supabase-js'
import { enrichLeadDetailUserNames } from '@/lib/anfragen/enrich-lead-user-names'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import type { LeadDetail, LeadTimelineRow } from '@/lib/types'

const SELECT_FULL = `
  *,
  kunden(*),
  angebote(
    id,
    status,
    gesamt_fix,
    gesamt_min,
    gesamt_max,
    positionen,
    created_at
  ),
  leads_status_history(*),
  kalender_termine(*),
  lead_notizen(*)
`

const SELECT_WITHOUT_ANGEBOTE = `
  *,
  kunden(*),
  leads_status_history(*),
  kalender_termine(*),
  lead_notizen(*)
`

const SELECT_MINIMAL = `
  *,
  kunden(*)
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
    const timeline = await loadLeadTimelineOptional(supabase, leadId)
    lead = { ...lead, lead_timeline: timeline }
    return enrichLeadDetailUserNames(supabase, lead)
  }

  return null
}

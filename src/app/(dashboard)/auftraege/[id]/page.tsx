import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import {
  loadAuftragDetail,
  listFormularTemplates,
} from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadRechnungenForAuftrag } from '@/app/(dashboard)/auftraege/auftraege-data'
import { listVertraegeFuerAuftrag, loadRahmenVertraegeForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'
import { loadAuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadPartnerDokumenteForAuftrag } from '@/app/(dashboard)/handwerker/actions'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadCrmTeamMitglieder } from '@/lib/crm-team'
import type { Lead, Preisliste, LeadTimelineRow } from '@/lib/types'

const LEAD_STAMMDATEN_SELECT =
  'id, plz, kontakt_name, kontakt_email, kontakt_telefon, funnel_daten'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const [
      detail,
      templates,
      gwRes,
      plRes,
      rechnungenListe,
      vertraegeListe,
      firm,
      team,
      finanzenPayload,
      complianceTypen,
      partnerDokumente,
    ] = await Promise.all([
      loadAuftragDetail(params.id),
      listFormularTemplates(),
      supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
      supabase.from('preislisten').select('*').order('gewerk_id'),
      loadRechnungenForAuftrag(params.id),
      listVertraegeFuerAuftrag(params.id),
      fetchFirmenEinstellungen(supabase),
      loadCrmTeamMitglieder(),
      loadAuftragFinanzenClientPayload(params.id),
      loadComplianceTypen(),
      loadPartnerDokumenteForAuftrag(params.id),
    ])

    if (!detail) notFound()

    const handwerkerIds = Array.from(
      new Set(
        (detail.auftrag_handwerker ?? [])
          .map((z) => z.handwerker_id)
          .filter(Boolean)
      )
    )
    const rahmenVertraegeByHandwerker = await loadRahmenVertraegeForHandwerker(handwerkerIds)

    let leadTimeline: LeadTimelineRow[] = []
    let lead: Pick<
      Lead,
      'id' | 'plz' | 'kontakt_name' | 'kontakt_email' | 'kontakt_telefon' | 'funnel_daten'
    > | null = null
    if (detail.lead_id) {
      const [{ data: tlByLead }, { data: leadRow }] = await Promise.all([
        supabase
          .from('lead_timeline')
          .select('*')
          .eq('lead_id', detail.lead_id)
          .order('created_at', { ascending: true }),
        supabase.from('leads').select(LEAD_STAMMDATEN_SELECT).eq('id', detail.lead_id).maybeSingle(),
      ])
      leadTimeline = (tlByLead ?? []) as LeadTimelineRow[]
      lead = (leadRow as typeof lead) ?? null
    }

    return (
      <AuftragDetailClient
        detail={detail}
        lead={lead}
        templates={templates}
        gewerke={(gwRes.data ?? []) as { id: string; name: string; slug: string }[]}
        preislisten={(plRes.data ?? []) as Preisliste[]}
        leadTimeline={leadTimeline}
        team={team}
        rechnungenListe={rechnungenListe}
        vertraegeListe={vertraegeListe}
        firm={firm}
        finanzenPayload={finanzenPayload}
        complianceTypen={complianceTypen}
        partnerDokumente={partnerDokumente}
        rahmenVertraegeByHandwerker={Object.fromEntries(rahmenVertraegeByHandwerker)}
      />
    )
  } catch (e) {
    console.error('[AuftragDetailPage]', params.id, e)
    throw e
  }
}

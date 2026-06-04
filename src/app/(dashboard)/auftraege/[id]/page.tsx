import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import {
  loadAuftragDetail,
  listFormularTemplates,
} from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadRechnungenForAuftrag } from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadAuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadCrmTeamMitglieder } from '@/lib/crm-team'
import type { Preisliste, LeadTimelineRow } from '@/lib/types'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const [detail, templates, gwRes, plRes, rechnungenListe, firm, team, finanzenPayload] =
      await Promise.all([
        loadAuftragDetail(params.id),
        listFormularTemplates(),
        supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
        supabase.from('preislisten').select('*').order('gewerk_id'),
        loadRechnungenForAuftrag(params.id),
        fetchFirmenEinstellungen(supabase),
        loadCrmTeamMitglieder(),
        loadAuftragFinanzenClientPayload(params.id),
      ])

    if (!detail) notFound()

    let leadTimeline: LeadTimelineRow[] = []
    if (detail.lead_id) {
      const { data: tlByLead } = await supabase
        .from('lead_timeline')
        .select('*')
        .eq('lead_id', detail.lead_id)
        .order('created_at', { ascending: true })
      leadTimeline = (tlByLead ?? []) as LeadTimelineRow[]
    }

    return (
      <AuftragDetailClient
        detail={detail}
        templates={templates}
        gewerke={(gwRes.data ?? []) as { id: string; name: string; slug: string }[]}
        preislisten={(plRes.data ?? []) as Preisliste[]}
        leadTimeline={leadTimeline}
        team={team}
        rechnungenListe={rechnungenListe}
        firm={firm}
        finanzenPayload={finanzenPayload}
      />
    )
  } catch (e) {
    console.error('[AuftragDetailPage]', params.id, e)
    throw e
  }
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import {
  loadAuftragDetail,
} from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadRechnungenForAuftrag } from '@/app/(dashboard)/auftraege/auftraege-data'
import { listVertraegeFuerAuftrag, loadRahmenVertraegeForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadPartnerDokumenteForAuftrag } from '@/app/(dashboard)/handwerker/actions'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadCrmTeamMitglieder } from '@/lib/crm-team'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import { loadAngebotDetail } from '@/lib/angebote/load-angebot-detail'
import type { Lead, LeadDetail, LeadTimelineRow, Preisliste } from '@/lib/types'

const LEAD_STAMMDATEN_SELECT =
  'id, plz, kontakt_name, kontakt_email, kontakt_telefon, funnel_daten, kanal, auftraggeber_kunde_id, anlass, situation, bereiche, kontakt_nachricht, notizen, budget_ca, preis_min, preis_max, created_at'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const [
      detail,
      gwRes,
      plRes,
      rechnungenListe,
      vertraegeListe,
      firm,
      team,
      complianceTypen,
      partnerDokumente,
    ] = await Promise.all([
      loadAuftragDetail(params.id),
      supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
      supabase.from('preislisten').select('*').order('gewerk_id'),
      loadRechnungenForAuftrag(params.id),
      listVertraegeFuerAuftrag(params.id),
      fetchFirmenEinstellungen(supabase),
      loadCrmTeamMitglieder(),
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

    let lead: Pick<
      Lead,
      | 'id'
      | 'plz'
      | 'kontakt_name'
      | 'kontakt_email'
      | 'kontakt_telefon'
      | 'funnel_daten'
      | 'kanal'
      | 'auftraggeber_kunde_id'
      | 'anlass'
      | 'situation'
      | 'kontakt_nachricht'
      | 'notizen'
      | 'budget_ca'
      | 'preis_min'
      | 'preis_max'
      | 'created_at'
    > | null = null

    const [leadTimeline, projektKontext, leadDetail, angebotDetail] = await Promise.all([
      detail.lead_id
        ? (async () => {
            const [{ data: tlByLead }, { data: leadRow }] = await Promise.all([
              supabase
                .from('lead_timeline')
                .select('*')
                .eq('lead_id', detail.lead_id!)
                .order('created_at', { ascending: true }),
              supabase.from('leads').select(LEAD_STAMMDATEN_SELECT).eq('id', detail.lead_id!).maybeSingle(),
            ])
            lead = (leadRow as typeof lead) ?? null
            return (tlByLead ?? []) as LeadTimelineRow[]
          })()
        : Promise.resolve([] as LeadTimelineRow[]),
      loadProjektKontext(supabase, {
        activeKind: 'auftrag',
        activeId: params.id,
        auftragId: params.id,
        leadId: detail.lead_id,
        kundeId: detail.kunde_id,
        angebotId: detail.angebot_id,
      }),
      detail.lead_id
        ? loadAnfrageDetail(supabase, detail.lead_id).then((d) => d as LeadDetail | null)
        : Promise.resolve(null),
      detail.angebot_id
        ? loadAngebotDetail(supabase, detail.angebot_id)
        : Promise.resolve(null),
    ])

    return (
      <AuftragDetailClient
        detail={detail}
        lead={lead}
        leadDetail={leadDetail}
        angebotDetail={angebotDetail}
        gewerke={(gwRes.data ?? []) as { id: string; name: string; slug: string }[]}
        preislisten={(plRes.data ?? []) as Preisliste[]}
        leadTimeline={leadTimeline}
        team={team}
        rechnungenListe={rechnungenListe}
        vertraegeListe={vertraegeListe}
        firm={firm}
        complianceTypen={complianceTypen}
        partnerDokumente={partnerDokumente}
        rahmenVertraegeByHandwerker={Object.fromEntries(rahmenVertraegeByHandwerker)}
        projektKontext={projektKontext}
      />
    )
  } catch (e) {
    console.error('[AuftragDetailPage]', params.id, e)
    throw e
  }
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import {
  loadAuftragDetail,
  loadRechnungenForAuftrag,
} from '@/app/(dashboard)/auftraege/auftraege-data'
import { listVertraegeFuerAuftrag, loadRahmenVertraegeForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadPartnerDokumenteForAuftrag } from '@/app/(dashboard)/handwerker/actions'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadCrmTeamMitglieder } from '@/lib/crm-team'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'
import { loadWizardContext } from '@/lib/wizard-context'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import type { AngebotDetail, LeadDetail, Preisliste } from '@/lib/types'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const [
      detail,
      wizardCtx,
      rechnungenListe,
      vertraegeListe,
      firm,
      team,
      complianceTypen,
      partnerDokumente,
    ] = await Promise.all([
      loadAuftragDetail(params.id, { mode: 'tabs' }),
      loadWizardContext(supabase),
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

    const [rahmenVertraegeByHandwerker, projektKontext, leadDetail] = await Promise.all([
      loadRahmenVertraegeForHandwerker(handwerkerIds),
      loadProjektKontext(supabase, {
        activeKind: 'auftrag',
        activeId: params.id,
        auftragId: params.id,
        leadId: detail.lead_id,
        kundeId: detail.kunde_id,
        angebotId: detail.angebot_id,
      }),
      detail.lead_id
        ? loadAnfrageDetail(supabase, detail.lead_id)
        : Promise.resolve(null as LeadDetail | null),
    ])

    const angebotDetail = (detail.angebote ?? null) as unknown as AngebotDetail | null

    return (
      <AuftragDetailClient
        detail={detail}
        lead={leadDetail}
        leadDetail={leadDetail}
        angebotDetail={angebotDetail}
        gewerke={wizardCtx.gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
        preislisten={wizardCtx.preislisten as Preisliste[]}
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

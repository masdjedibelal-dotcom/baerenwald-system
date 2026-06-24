import { notFound } from 'next/navigation'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { AngebotDetailPageClient } from '@/components/angebote/AngebotDetailPageClient'
import { loadWizardContext } from '@/lib/wizard-context'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import type { AngebotDetail, LeadDetail, LeadTimelineRow } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { loadKiVisualisierungenForAngebot } from '@/lib/visualize/queries'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'

export default async function AngebotDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('angebote')
      .select(
        `
      *,
      kunden(*),
      leads(
        id,
        kontakt_name,
        situation,
        bereiche,
        kunden!kunde_id(*)
      ),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, firma),
        gewerke(id, name, slug)
      )
    `
      )
      .eq('id', params.id)
      .maybeSingle()
  )

  if (error || !data) notFound()

  const detail: AngebotDetail = {
    ...(data as AngebotDetail),
    positionen: normalizeAngebotPositionen((data as { positionen: unknown }).positionen),
  }

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('id')
    .eq('angebot_id', params.id)
    .maybeSingle()

  let timeline: LeadTimelineRow[] = []
  const { data: tlByAngebot } = await supabase
    .from('lead_timeline')
    .select('*')
    .eq('angebot_id', params.id)
    .order('created_at', { ascending: true })

  if (tlByAngebot?.length) {
    timeline = tlByAngebot as LeadTimelineRow[]
  } else if (detail.lead_id) {
    const { data: tlByLead } = await supabase
      .from('lead_timeline')
      .select('*')
      .eq('lead_id', detail.lead_id)
      .order('created_at', { ascending: true })
    timeline = (tlByLead ?? []) as LeadTimelineRow[]
  }

  const [{ gewerke, preislisten: wizardPreislisten, firm }, leadDetail, kiVisualisierungen, projektKontext] =
    await Promise.all([
      loadWizardContext(supabase),
      detail.lead_id ? loadAnfrageDetail(supabase, detail.lead_id) : Promise.resolve(null),
      loadKiVisualisierungenForAngebot(params.id),
      loadProjektKontext(supabase, {
        activeKind: 'angebot',
        activeId: params.id,
        angebotId: params.id,
        leadId: detail.lead_id,
        kundeId: detail.kunde_id,
        auftragId: (auftrag as { id: string } | null)?.id ?? null,
      }),
    ])

  return (
    <AngebotDetailPageClient
      detail={detail}
      timeline={timeline}
      auftragId={(auftrag as { id: string } | null)?.id ?? null}
      gewerke={gewerke}
      wizardPreislisten={wizardPreislisten}
      wizardFirm={firm}
      kiVisualisierungen={kiVisualisierungen}
      lead={leadDetail as LeadDetail | null}
      projektKontext={projektKontext}
    />
  )
}

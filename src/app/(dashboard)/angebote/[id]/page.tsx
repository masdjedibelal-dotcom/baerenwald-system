import { notFound } from 'next/navigation'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { AngebotDetailPageClient } from '@/components/angebote/AngebotDetailPageClient'
import { loadWizardContext } from '@/lib/wizard-context'
import type { AngebotDetail, Handwerker, LeadDetail, LeadTimelineRow } from '@/lib/types'
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

  const [{ data: auftrag }, tlByAngebotRes] = await Promise.all([
    supabase.from('auftraege').select('id').eq('angebot_id', params.id).maybeSingle(),
    supabase
      .from('lead_timeline')
      .select('*')
      .eq('angebot_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  let timeline: LeadTimelineRow[] = (tlByAngebotRes.data ?? []) as LeadTimelineRow[]
  if (!timeline.length && detail.lead_id) {
    const { data: tlByLead } = await supabase
      .from('lead_timeline')
      .select('*')
      .eq('lead_id', detail.lead_id)
      .order('created_at', { ascending: true })
    timeline = (tlByLead ?? []) as LeadTimelineRow[]
  }

  const auftragId = (auftrag as { id: string } | null)?.id ?? null

  const [{ gewerke, preislisten: wizardPreislisten, firm }, leadDetail, kiVisualisierungen, projektKontext, { data: hwRows }] =
    await Promise.all([
      loadWizardContext(supabase),
      // Schlankes Lead statt Full-Anfrage-Detail (Angebot hat schon Lead-Embed)
      detail.lead_id
        ? supabase
            .from('leads')
            .select(
              'id, status, kanal, anlass, situation, bereiche, kontakt_name, kontakt_email, kontakt_telefon, funnel_daten, auftraggeber_kunde_id, org_freigabe_status, kundentyp, created_at, plz, notizen, budget_ca, preis_min, preis_max, kunde_id'
            )
            .eq('id', detail.lead_id)
            .maybeSingle()
            .then((r) => (r.data as LeadDetail | null) ?? null)
        : Promise.resolve(null),
      loadKiVisualisierungenForAngebot(params.id),
      loadProjektKontext(supabase, {
        activeKind: 'angebot',
        activeId: params.id,
        angebotId: params.id,
        leadId: detail.lead_id,
        kundeId: detail.kunde_id,
        auftragId,
      }),
      supabase
        .from('handwerker')
        .select('id, name, email, telefon, gewerke, firma, aktiv')
        .eq('aktiv', true)
        .order('name'),
    ])

  return (
    <AngebotDetailPageClient
      detail={detail}
      timeline={timeline}
      auftragId={auftragId}
      gewerke={gewerke}
      wizardPreislisten={wizardPreislisten}
      wizardFirm={firm}
      wizardHandwerker={(hwRows ?? []) as Handwerker[]}
      kiVisualisierungen={kiVisualisierungen}
      lead={leadDetail as LeadDetail | null}
      projektKontext={projektKontext}
    />
  )
}

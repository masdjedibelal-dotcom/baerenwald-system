import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'
import { loadWizardContext } from '@/lib/wizard-context'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { leadVertragsKundeId, resolveLeadKunde } from '@/lib/lead-display-helpers'
import { istKundeGewerbeTyp, istKundeHausverwaltungTyp } from '@/lib/kunde-stammdaten'
import { handwerkerPipelineErledigt } from '@/lib/angebote/angebot-handwerker-flow'
import { CrmPageLoading } from '@/components/layout/CrmPageLoading'
import type { AngebotHandwerkerRow, Handwerker, KundenObjekt, LeadDetail } from '@/lib/types'

/** Schwere Client-Bundle (Wizard, PDF) aus Page-Chunk auslagern — verhindert ChunkLoadError bei HMR. */
const AnfrageDetailClient = dynamic(
  () =>
    import('@/components/anfragen/AnfrageDetailClient').then((mod) => ({
      default: mod.AnfrageDetailClient,
    })),
  {
    loading: () => <CrmPageLoading label="Anfrage wird geladen …" />,
  }
)

export default async function AnfrageDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: {
    angebot_kopie_von?: string
    angebote?: string
    angebot_wizard?: string
    wizard_step?: string
    focus?: string
    tab?: string
  }
}) {
  const angeboteAuswahlInitial = searchParams?.angebote === '1'
  const angebotWizardInitial = searchParams?.angebot_wizard === '1'
  const wizardStepRaw = Number(searchParams?.wizard_step)
  const angebotWizardInitialStep =
    Number.isFinite(wizardStepRaw) && wizardStepRaw >= 1 && wizardStepRaw <= 5
      ? Math.floor(wizardStepRaw)
      : searchParams?.focus === 'positionen'
        ? 2
        : null
  const angebotWizardFocus = searchParams?.focus?.trim() || null
  const supabase = createClient()
  const lead = await loadAnfrageDetail(supabase, params.id)

  if (!lead) notFound()

  const history = [...(lead.leads_status_history ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const angeboteFromLead = lead.angebote as
    | {
        id: string
        status: string
        gesamt_fix?: number | null
        gesamt_min: number | null
        gesamt_max: number | null
        created_at: string
      }[]
    | null
    | undefined

  const [{ gewerke, preislisten, firm }, { data: hwRows }, latestAngebotRes] = await Promise.all([
    loadWizardContext(supabase),
    supabase
      .from('handwerker')
      .select('id, name, email, telefon, gewerke')
      .eq('aktiv', true)
      .order('name'),
    supabase
      .from('angebote')
      .select(
        `
        id,
        status,
        gesendet_kunde_at,
        angebot_handwerker(id, status, hw_status, hw_eingereicht_at)
      `
      )
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const latestAngebot = latestAngebotRes.data as {
    id: string
    status: string
    gesendet_kunde_at?: string | null
    angebot_handwerker?: AngebotHandwerkerRow[] | null
  } | null

  const angebotFlowSnapshot = latestAngebot
    ? {
        angebotId: latestAngebot.id,
        angebotHref: `/angebote/${latestAngebot.id}`,
        handwerkerErledigt: handwerkerPipelineErledigt(latestAngebot.angebot_handwerker),
        angebotAnKundeGesendet: Boolean(
          latestAngebot.gesendet_kunde_at ||
            latestAngebot.status === 'gesendet_kunde' ||
            latestAngebot.status === 'kunde_akzeptiert'
        ),
      }
    : null

  const wizardHandwerker = (hwRows ?? []) as Handwerker[]

  const kunde = resolveLeadKunde(lead.kunden)
  const ag = lead.auftraggeber
  const kundeId = leadVertragsKundeId(lead)
  const kundeTyp = resolveAngebotKundeTyp(
    ag?.typ ?? kunde?.typ,
    ag ? 'hausverwaltung' : lead.kundentyp
  )

  const [{ data: auftragRow }, projektKontext] = await Promise.all([
    supabase
      .from('auftraege')
      .select('id')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadProjektKontext(supabase, {
      activeKind: 'anfrage',
      activeId: params.id,
      leadId: params.id,
      kundeId,
    }),
  ])

  const dbAuftragId = (auftragRow as { id: string } | null)?.id ?? null
  let kundenObjekte: KundenObjekt[] = []
  if (
    kundeId &&
    (istKundeGewerbeTyp(kundeTyp) || istKundeHausverwaltungTyp(ag?.typ ?? kundeTyp))
  ) {
    kundenObjekte = await fetchKundenObjekte(kundeId)
  }

  if (angeboteFromLead && angeboteFromLead.length) {
    const sorted = [...angeboteFromLead].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const angebotKopieVon =
      typeof searchParams?.angebot_kopie_von === 'string' && searchParams.angebot_kopie_von.trim()
        ? searchParams.angebot_kopie_von.trim()
        : undefined
    return (
      <AnfrageDetailClient
        lead={{ ...lead, leads_status_history: history }}
        angeboteListe={sorted}
        wizardGewerke={gewerke}
        wizardPreislisten={preislisten}
        wizardFirm={firm}
        kundenObjekte={kundenObjekte}
        angebotKopieVonQuelleId={angebotKopieVon}
        wizardHandwerker={wizardHandwerker}
        angebotFlowSnapshot={angebotFlowSnapshot}
        angeboteAuswahlInitial={angeboteAuswahlInitial}
        angebotWizardInitial={angebotWizardInitial}
        projektKontext={projektKontext}
        dbAuftragId={dbAuftragId}
      />
    )
  }

  const { data: angebotRows } = await supabase
    .from('angebote')
    .select('id, status, status_einfach, gesamt_fix, gesamt_min, gesamt_max, created_at, angebotsnr, pdf_url')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  const angebotKopieVon =
    typeof searchParams?.angebot_kopie_von === 'string' && searchParams.angebot_kopie_von.trim()
      ? searchParams.angebot_kopie_von.trim()
      : undefined

  return (
    <AnfrageDetailClient
      lead={{ ...lead, leads_status_history: history } as LeadDetail}
      angeboteListe={(angebotRows ?? []) as never}
      wizardGewerke={gewerke}
      wizardPreislisten={preislisten}
      wizardFirm={firm}
      kundenObjekte={kundenObjekte}
      angebotKopieVonQuelleId={angebotKopieVon}
      wizardHandwerker={wizardHandwerker}
      angebotFlowSnapshot={angebotFlowSnapshot}
      angeboteAuswahlInitial={angeboteAuswahlInitial}
      angebotWizardInitial={angebotWizardInitial}
      angebotWizardInitialStep={angebotWizardInitialStep}
      angebotWizardFocus={angebotWizardFocus}
      projektKontext={projektKontext}
      dbAuftragId={dbAuftragId}
    />
  )
}

import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import { loadWizardContext } from '@/lib/wizard-context'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import type { KundenObjekt, LeadDetail } from '@/lib/types'

/** Schwere Client-Bundle (Wizard, PDF) aus Page-Chunk auslagern — verhindert ChunkLoadError bei HMR. */
const AnfrageDetailClient = dynamic(
  () =>
    import('@/components/anfragen/AnfrageDetailClient').then((mod) => ({
      default: mod.AnfrageDetailClient,
    })),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-bw-text-muted">
        Anfrage wird geladen…
      </div>
    ),
  }
)

export default async function AnfrageDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { angebot_kopie_von?: string }
}) {
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

  const [{ gewerke, preislisten, firm }] = await Promise.all([loadWizardContext(supabase)])

  const kunde = resolveLeadKunde(lead.kunden)
  const kundeId = kunde?.id ?? lead.kunde_id
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, lead.kundentyp)
  let kundenObjekte: KundenObjekt[] = []
  if (kundeId && istKundeGewerbeTyp(kundeTyp)) {
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
      />
    )
  }

  const { data: angebotRows } = await supabase
    .from('angebote')
    .select('id, status, gesamt_fix, gesamt_min, gesamt_max, created_at, angebotsnr, pdf_url')
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
    />
  )
}

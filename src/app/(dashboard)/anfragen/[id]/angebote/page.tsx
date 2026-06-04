import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { loadWizardContext } from '@/lib/wizard-context'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import { AngebotAuswahlPageClient } from '@/components/angebote/AngebotAuswahlPageClient'

export default async function AnfrageAngebotePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const lead = await loadAnfrageDetail(supabase, params.id)
  if (!lead) notFound()

  const { data: angebotRows } = await supabase
    .from('angebote')
    .select('id, status, gesamt_fix, gesamt_min, gesamt_max, created_at')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  const [{ gewerke, preislisten, firm }] = await Promise.all([loadWizardContext(supabase)])

  const kunde = resolveLeadKunde(lead.kunden)
  const kundeId = kunde?.id ?? lead.kunde_id
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, lead.kundentyp)
  let kundenObjekte: import('@/lib/types').KundenObjekt[] = []
  if (kundeId && istKundeGewerbeTyp(kundeTyp)) {
    kundenObjekte = await fetchKundenObjekte(kundeId)
  }

  return (
    <AngebotAuswahlPageClient
      lead={lead}
      angebote={angebotRows ?? []}
      gewerke={gewerke}
      preislisten={preislisten}
      firm={firm}
      kundenObjekte={kundenObjekte}
    />
  )
}

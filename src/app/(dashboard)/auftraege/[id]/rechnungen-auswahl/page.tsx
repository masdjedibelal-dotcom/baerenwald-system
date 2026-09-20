import { notFound } from 'next/navigation'
import { loadAuftragDetail, loadRechnungenForAuftrag } from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadWizardContext } from '@/lib/wizard-context'
import { RechnungAuswahlPageClient } from '@/components/rechnungen/RechnungAuswahlPageClient'
import { defaultZahlungszielTage } from '@/lib/rechnungen/rechnung-wizard-types'

export default async function AuftragRechnungenAuswahlPage({ params }: { params: { id: string } }) {
  const [detail, rechnungen, ctx] = await Promise.all([
    loadAuftragDetail(params.id),
    loadRechnungenForAuftrag(params.id),
    loadWizardContext(),
  ])
  if (!detail) notFound()

  const zahlungszielTage = defaultZahlungszielTage(detail.kunden?.typ)

  return (
    <RechnungAuswahlPageClient
      auftragId={params.id}
      rechnungen={rechnungen}
      gewerke={ctx.gewerke}
      preislisten={ctx.preislisten}
      firm={ctx.firm}
      zahlungszielTage={zahlungszielTage}
    />
  )
}

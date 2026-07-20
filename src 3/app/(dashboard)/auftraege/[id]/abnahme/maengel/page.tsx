import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { AuftragAbnahmeMaengelFlowClient } from '@/components/auftraege/AuftragAbnahmeMaengelFlowClient'

export default async function AuftragAbnahmeMaengelPage({ params }: { params: { id: string } }) {
  const detail = await loadAuftragDetail(params.id)
  if (!detail) notFound()

  const kundeName = detail.kunden?.name?.trim() || 'Kunde'

  return <AuftragAbnahmeMaengelFlowClient auftragId={params.id} kundeName={kundeName} />
}

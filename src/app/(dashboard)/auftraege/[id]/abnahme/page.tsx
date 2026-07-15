import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { AuftragAbnahmeFlowClient } from '@/components/auftraege/AuftragAbnahmeFlowClient'

export default async function AuftragAbnahmePage({ params }: { params: { id: string } }) {
  const detail = await loadAuftragDetail(params.id)
  if (!detail) notFound()

  const kundeName = detail.kunden?.name?.trim() || 'Kunde'

  return <AuftragAbnahmeFlowClient auftragId={params.id} kundeName={kundeName} />
}

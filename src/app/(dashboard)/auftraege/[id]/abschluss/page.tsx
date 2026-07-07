import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { AuftragAbschlussFlowClient } from '@/components/auftraege/AuftragAbschlussFlowClient'

export default async function AuftragAbschlussPage({ params }: { params: { id: string } }) {
  const detail = await loadAuftragDetail(params.id)
  if (!detail) notFound()

  const kundeName = detail.kunden?.name?.trim() || 'Kunde'

  return <AuftragAbschlussFlowClient auftragId={params.id} kundeName={kundeName} />
}

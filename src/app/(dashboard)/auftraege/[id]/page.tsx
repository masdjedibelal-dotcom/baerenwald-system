import { notFound } from 'next/navigation'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import { loadAuftragDetail, listFormularTemplates } from '@/app/(dashboard)/auftraege/actions'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  const [detail, templates] = await Promise.all([
    loadAuftragDetail(params.id),
    listFormularTemplates(),
  ])

  if (!detail) notFound()

  return <AuftragDetailClient detail={detail} templates={templates} />
}

import { notFound } from 'next/navigation'
import { AuftragDetailClient } from '@/components/auftraege/AuftragDetailClient'
import { loadAuftragDetail, loadEmailLogForAuftrag, listFormularTemplates } from '@/app/(dashboard)/auftraege/actions'

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  const [detail, templates, emailLog] = await Promise.all([
    loadAuftragDetail(params.id),
    listFormularTemplates(),
    loadEmailLogForAuftrag(params.id),
  ])

  if (!detail) notFound()

  return <AuftragDetailClient detail={detail} templates={templates} emailLog={emailLog} />
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { KundeDetailClient } from '@/components/kunden/KundeDetailClient'
import { loadKundeDetail } from '@/lib/kunden/load-kunde-detail'
import { getCustomFields, getCustomValues } from '@/lib/custom-fields'

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kunde = await loadKundeDetail(id)
  if (!kunde) notFound()

  const [customFieldDefs, customValues] = await Promise.all([
    getCustomFields('kunde'),
    getCustomValues(id),
  ])

  return (
    <div>
      <PageHeader
        title={kunde.name}
        breadcrumbs={[
          { label: 'Kunden', href: '/kunden' },
          { label: kunde.kundennummer ?? kunde.name },
        ]}
        action={
          <Link href="/kunden" className="btn btn-secondary btn-sm">
            ← Zur Liste
          </Link>
        }
      />
      <KundeDetailClient kunde={kunde} customFieldDefs={customFieldDefs} customValues={customValues} />
    </div>
  )
}

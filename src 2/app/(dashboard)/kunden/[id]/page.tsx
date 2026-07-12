import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { KundeDetailClient } from '@/components/kunden/KundeDetailClient'
import { loadKundeDetail } from '@/lib/kunden/load-kunde-detail'
import { findVerwandteStammdatenKontakte } from '@/app/actions/stammdaten-kontakt'
import { getCustomFields, getCustomValues } from '@/lib/custom-fields'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const kunde = await loadKundeDetail(id)
  return { title: kunde?.name?.trim() ? kunde.name : 'Kunde' }
}

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kunde = await loadKundeDetail(id)
  if (!kunde) notFound()

  const [customFieldDefs, customValues, kundenObjekte, verwandteStammdaten] = await Promise.all([
    getCustomFields('kunde'),
    getCustomValues(id),
    istKundeGewerbeTyp(kunde.typ) ? fetchKundenObjekte(id) : Promise.resolve([]),
    findVerwandteStammdatenKontakte({
      email: kunde.email,
      telefon: kunde.telefon,
      excludeTyp: 'kunde',
      excludeId: id,
    }),
  ])

  return (
    <div>
      <KundeDetailClient
        kunde={kunde}
        customFieldDefs={customFieldDefs}
        customValues={customValues}
        kundenObjekte={kundenObjekte}
        verwandteStammdaten={verwandteStammdaten}
      />
    </div>
  )
}

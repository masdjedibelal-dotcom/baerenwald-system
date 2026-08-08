import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { KundeDetailClient } from '@/components/kunden/KundeDetailClient'
import { loadKundeDetail } from '@/lib/kunden/load-kunde-detail'
import { getCustomFields, getCustomValues } from '@/lib/custom-fields'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import { createClient } from '@/lib/supabase-server'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient()
  const { data } = await supabase
    .from('kunden')
    .select('name, vorname, nachname')
    .eq('id', id)
    .maybeSingle()
  const title =
    data?.name?.trim() ||
    [data?.vorname?.trim(), data?.nachname?.trim()].filter(Boolean).join(' ') ||
    'Kunde'
  return { title }
}

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kunde = await loadKundeDetail(id)
  if (!kunde) notFound()

  const [customFieldDefs, customValues, kundenObjekte, vorgaenge] = await Promise.all([
    getCustomFields('kunde'),
    getCustomValues(id),
    istKundeGewerbeTyp(kunde.typ) ? fetchKundenObjekte(id) : Promise.resolve([]),
    loadVorgaengeListe({ kundeId: id }),
  ])

  return (
    <div>
      <KundeDetailClient
        key={id}
        kunde={kunde}
        customFieldDefs={customFieldDefs}
        customValues={customValues}
        kundenObjekte={kundenObjekte}
        vorgaengeRows={vorgaenge.rows}
      />
    </div>
  )
}

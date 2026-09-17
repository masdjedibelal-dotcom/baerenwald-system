import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ObjektAkteDetailClient } from '@/components/objektakte/ObjektAkteDetailClient'
import { computeObjektKpis } from '@/lib/objektakte/compute-objekt-kpis'
import { loadObjektHistorie } from '@/lib/objektakte/load-objekt-historie'
import { loadKundeDetail } from '@/lib/kunden/load-kunde-detail'
import { loadKundenObjektForAkte, loadObjektAkteDetail } from '@/lib/objektakte/load-objekt-akte'
import { createClient } from '@/lib/supabase-server'
import type { Gewerk } from '@/lib/types'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; objektId: string }>
}): Promise<Metadata> {
  const { id, objektId } = await params
  const objekt = await loadKundenObjektForAkte(id, objektId)
  return { title: objekt?.titel?.trim() ? `Objekt · ${objekt.titel}` : 'Objektakte' }
}

export default async function ObjektAktePage({
  params,
}: {
  params: Promise<{ id: string; objektId: string }>
}) {
  const { id: kundeId, objektId } = await params
  const supabase = createClient()
  const [kunde, akte, vorgaenge, historie, gewerkeRes] = await Promise.all([
    loadKundeDetail(kundeId),
    loadObjektAkteDetail(kundeId, objektId),
    loadVorgaengeListe({ kundeId }),
    loadObjektHistorie(kundeId, objektId),
    supabase
      .from('gewerke')
      .select('id, name, slug, aktiv')
      .eq('aktiv', true)
      .order('name'),
  ])
  const gewerke = (gewerkeRes.data ?? []) as Gewerk[]

  if (!kunde || !akte) notFound()

  const objekt = await loadKundenObjektForAkte(kundeId, objektId)
  if (!objekt) notFound()

  const kpis = computeObjektKpis(historie.rows, akte.anlagen.length)

  return (
    <ObjektAkteDetailClient
      kunde={kunde}
      objekt={objekt}
      akte={akte}
      historieRows={historie.rows}
      objektLeadIds={historie.leadIds}
      kpis={kpis}
      vorgaengeRows={vorgaenge.rows}
      gewerke={gewerke}
    />
  )
}

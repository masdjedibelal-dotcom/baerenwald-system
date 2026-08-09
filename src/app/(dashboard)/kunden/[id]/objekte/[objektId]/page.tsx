import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ObjektAkteDetailClient } from '@/components/objektakte/ObjektAkteDetailClient'
import { loadKundeDetail } from '@/lib/kunden/load-kunde-detail'
import { loadKundenObjektForAkte, loadObjektAkteDetail } from '@/lib/objektakte/load-objekt-akte'

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
  const [kunde, akte] = await Promise.all([
    loadKundeDetail(kundeId),
    loadObjektAkteDetail(kundeId, objektId),
  ])

  if (!kunde || !akte) notFound()

  const objekt = await loadKundenObjektForAkte(kundeId, objektId)
  if (!objekt) notFound()

  return <ObjektAkteDetailClient kunde={kunde} objekt={objekt} akte={akte} />
}

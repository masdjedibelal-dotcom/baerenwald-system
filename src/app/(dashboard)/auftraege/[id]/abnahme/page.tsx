import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { AuftragAbnahmeFlowClient } from '@/components/auftraege/AuftragAbnahmeFlowClient'
import { createClient } from '@/lib/supabase-server'

export default async function AuftragAbnahmePage({ params }: { params: { id: string } }) {
  const detail = await loadAuftragDetail(params.id)
  if (!detail) notFound()

  const supabase = createClient()
  const { data: gewerkeRows } = await supabase.from('gewerke').select('id, name, slug').order('name')

  const kundeName = detail.kunden?.name?.trim() || 'Kunde'
  const positionen = detail.auftrag_positionen ?? []

  return (
    <AuftragAbnahmeFlowClient
      auftragId={params.id}
      positionen={positionen}
      angebotPositionen={detail.angebote?.positionen ?? []}
      gewerke={gewerkeRows ?? []}
      kundeName={kundeName}
    />
  )
}

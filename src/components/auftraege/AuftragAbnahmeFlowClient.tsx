'use client'

import { useRouter } from 'next/navigation'
import { AbnahmeprotokollModal } from '@/components/auftraege/AbnahmeprotokollModal'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'

export function AuftragAbnahmeFlowClient({
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
}) {
  const router = useRouter()

  return (
    <AbnahmeprotokollModal
      presentation="flow"
      open
      auftragId={auftragId}
      positionen={positionen}
      angebotPositionen={angebotPositionen}
      gewerke={gewerke}
      kundeName={kundeName}
      onClose={() => router.push(`/auftraege/${auftragId}`)}
      onDone={() => {
        router.push(`/auftraege/${auftragId}`)
        router.refresh()
      }}
    />
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { AbnahmeprotokollModal } from '@/components/auftraege/AbnahmeprotokollModal'
import type { AuftragPosition } from '@/lib/types'

export function AuftragAbnahmeFlowClient({
  auftragId,
  positionen,
  kundeName,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  kundeName: string
}) {
  const router = useRouter()

  return (
    <AbnahmeprotokollModal
      presentation="flow"
      open
      auftragId={auftragId}
      positionen={positionen}
      kundeName={kundeName}
      onClose={() => router.push(`/auftraege/${auftragId}`)}
      onDone={() => {
        router.push(`/auftraege/${auftragId}`)
        router.refresh()
      }}
    />
  )
}

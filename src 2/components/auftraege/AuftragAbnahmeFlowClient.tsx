'use client'

import { useRouter } from 'next/navigation'
import { AbnahmeprotokollFillFlow } from '@/components/auftraege/AbnahmeprotokollFillFlow'

export function AuftragAbnahmeFlowClient({
  auftragId,
  kundeName,
}: {
  auftragId: string
  kundeName: string
}) {
  const router = useRouter()

  return (
    <AbnahmeprotokollFillFlow
      auftragId={auftragId}
      kundeName={kundeName}
      onClose={() => router.push(`/auftraege/${auftragId}`)}
      onDone={() => {
        router.push(`/auftraege/${auftragId}`)
        router.refresh()
      }}
    />
  )
}

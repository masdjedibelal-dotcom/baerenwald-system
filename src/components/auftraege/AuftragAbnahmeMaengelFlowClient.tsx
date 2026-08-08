'use client'

import { useRouter } from 'next/navigation'
import { AbnahmeMaengelBearbeitenFlow } from '@/components/auftraege/AbnahmeMaengelBearbeitenFlow'

export function AuftragAbnahmeMaengelFlowClient({
  auftragId,
  kundeName,
}: {
  auftragId: string
  kundeName: string
}) {
  const router = useRouter()

  return (
    <AbnahmeMaengelBearbeitenFlow
      auftragId={auftragId}
      kundeName={kundeName}
      onClose={() => router.push(`/auftraege/${auftragId}?tab=abnahme`)}
      onDone={() => {
        router.push(`/auftraege/${auftragId}?tab=abnahme`)
        router.refresh()
      }}
    />
  )
}

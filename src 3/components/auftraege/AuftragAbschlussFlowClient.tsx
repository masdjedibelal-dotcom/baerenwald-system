'use client'

import { useRouter } from 'next/navigation'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'

export function AuftragAbschlussFlowClient({
  auftragId,
  kundeName,
}: {
  auftragId: string
  kundeName: string
}) {
  const router = useRouter()

  return (
    <AbschlussdokumentationModal
      presentation="flow"
      open
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

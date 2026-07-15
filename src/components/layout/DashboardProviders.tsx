'use client'

import { DatenschutzHintModal } from '@/components/datenschutz/DatenschutzHintModal'
import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'

export function DashboardProviders({
  children,
  datenschutzHintDismissed = false,
}: {
  children: React.ReactNode
  datenschutzHintDismissed?: boolean
}) {
  return (
    <>
      {children}
      <DatenschutzHintModal dismissedOnServer={datenschutzHintDismissed} />
      <ChunkLoadRecovery />
    </>
  )
}

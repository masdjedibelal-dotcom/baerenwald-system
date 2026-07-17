'use client'

import { DatenschutzHintModal } from '@/components/datenschutz/DatenschutzHintModal'
import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({
  children,
  datenschutzHintDismissed = false,
}: {
  children: React.ReactNode
  datenschutzHintDismissed?: boolean
}) {
  return (
    <ConfirmDeleteProvider>
      {children}
      <DatenschutzHintModal dismissedOnServer={datenschutzHintDismissed} />
      <ChunkLoadRecovery />
    </ConfirmDeleteProvider>
  )
}

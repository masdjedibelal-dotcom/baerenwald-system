'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmDeleteProvider>
      {children}
      <ChunkLoadRecovery />
    </ConfirmDeleteProvider>
  )
}

'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionKeepAlive } from '@/components/layout/SessionKeepAlive'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmDeleteProvider>
      {children}
      <SessionKeepAlive />
      <ChunkLoadRecovery />
    </ConfirmDeleteProvider>
  )
}

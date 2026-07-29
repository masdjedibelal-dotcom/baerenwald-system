'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionKeepAlive } from '@/components/layout/SessionKeepAlive'
import { ActionBusyProvider } from '@/components/ui/action-busy'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActionBusyProvider>
      <ConfirmDeleteProvider>
        {children}
        <SessionKeepAlive />
        <ChunkLoadRecovery />
      </ConfirmDeleteProvider>
    </ActionBusyProvider>
  )
}

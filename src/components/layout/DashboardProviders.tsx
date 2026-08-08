'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionGuard } from '@/components/layout/SessionGuard'
import { ActionBusyProvider } from '@/components/ui/action-busy'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActionBusyProvider>
      <ConfirmDeleteProvider>
        {children}
        <SessionGuard />
        <ChunkLoadRecovery />
      </ConfirmDeleteProvider>
    </ActionBusyProvider>
  )
}

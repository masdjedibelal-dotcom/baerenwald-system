'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionGuard } from '@/components/layout/SessionGuard'
import { PushSwRegistrar } from '@/components/push/PushSwRegistrar'
import { PwaStandaloneClass } from '@/components/push/PwaStandaloneClass'
import { ActionBusyProvider } from '@/components/ui/action-busy'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActionBusyProvider>
      <ConfirmDeleteProvider>
        {children}
        <SessionGuard />
        <ChunkLoadRecovery />
        <PwaStandaloneClass />
        <PushSwRegistrar />
      </ConfirmDeleteProvider>
    </ActionBusyProvider>
  )
}

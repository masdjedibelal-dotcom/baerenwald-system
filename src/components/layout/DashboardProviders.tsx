'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionGuard } from '@/components/layout/SessionGuard'
import { PushSwRegistrar } from '@/components/push/PushSwRegistrar'
import { PwaStandaloneClass } from '@/components/push/PwaStandaloneClass'
import { ActionBusyProvider } from '@/components/ui/action-busy'
import { ConfirmActionProvider } from '@/components/ui/confirm-action'
import { ConfirmDeleteProvider } from '@/components/ui/confirm-delete'
import { ConfirmKundeDeleteProvider } from '@/components/ui/confirm-kunde-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActionBusyProvider>
      <ConfirmActionProvider>
        <ConfirmDeleteProvider>
          <ConfirmKundeDeleteProvider>
            {children}
            <SessionGuard />
            <ChunkLoadRecovery />
            <PwaStandaloneClass />
            <PushSwRegistrar />
          </ConfirmKundeDeleteProvider>
        </ConfirmDeleteProvider>
      </ConfirmActionProvider>
    </ActionBusyProvider>
  )
}

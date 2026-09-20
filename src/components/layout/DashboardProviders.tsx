'use client'

import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'
import { SessionGuard } from '@/components/layout/SessionGuard'
import { PushSwRegistrar } from '@/components/push/PushSwRegistrar'
import { PwaStandaloneClass } from '@/components/push/PwaStandaloneClass'
import { ActionBusyProvider } from '@/components/ui/action-busy'
import { ConfirmPopupHost } from '@/components/ui/ConfirmPopup'
import { ConfirmKundeDeleteProvider } from '@/components/ui/confirm-kunde-delete'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActionBusyProvider>
      <ConfirmPopupHost>
        <ConfirmKundeDeleteProvider>
          {children}
          <SessionGuard />
          <ChunkLoadRecovery />
          <PwaStandaloneClass />
          <PushSwRegistrar />
        </ConfirmKundeDeleteProvider>
      </ConfirmPopupHost>
    </ActionBusyProvider>
  )
}

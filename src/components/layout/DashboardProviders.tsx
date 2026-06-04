'use client'

import { DatenschutzHintModal } from '@/components/datenschutz/DatenschutzHintModal'
import { ChunkLoadRecovery } from '@/components/layout/ChunkLoadRecovery'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DatenschutzHintModal />
      <ChunkLoadRecovery />
    </>
  )
}

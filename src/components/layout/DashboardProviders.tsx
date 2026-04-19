'use client'

import { DatenschutzHintModal } from '@/components/datenschutz/DatenschutzHintModal'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DatenschutzHintModal />
    </>
  )
}

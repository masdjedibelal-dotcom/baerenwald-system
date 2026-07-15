'use client'

import type { ReactNode } from 'react'
import { EinstellungenDetailShell } from '@/components/einstellungen/EinstellungenDetailShell'

export function EinstellungenLayoutClient({
  teamCount,
  children,
}: {
  teamCount: number
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <EinstellungenDetailShell teamCount={teamCount}>{children}</EinstellungenDetailShell>
    </div>
  )
}

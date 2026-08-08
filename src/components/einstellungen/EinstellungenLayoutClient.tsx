'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { EinstellungenDetailShell } from '@/components/einstellungen/EinstellungenDetailShell'

export function EinstellungenLayoutClient({
  teamCount,
  children,
}: {
  teamCount: number
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const isHub = pathname === '/einstellungen'

  if (isHub) {
    return <div className="min-w-0">{children}</div>
  }

  return (
    <div className="min-w-0">
      <EinstellungenDetailShell teamCount={teamCount}>{children}</EinstellungenDetailShell>
    </div>
  )
}

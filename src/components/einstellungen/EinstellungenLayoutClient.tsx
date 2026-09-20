'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { EinstellungenDetailShell } from '@/components/einstellungen/EinstellungenDetailShell'

export function EinstellungenLayoutClient({
  teamCount,
  showDemoBanner = false,
  children,
}: {
  teamCount: number
  showDemoBanner?: boolean
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const isHub = pathname === '/einstellungen'

  const banner = showDemoBanner ? <DemoModeBanner /> : null

  if (isHub) {
    return (
      <div className="min-w-0">
        {banner}
        {children}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {banner}
      <EinstellungenDetailShell teamCount={teamCount}>{children}</EinstellungenDetailShell>
    </div>
  )
}

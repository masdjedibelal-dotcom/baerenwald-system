'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { EinstellungenTabNav } from '@/components/einstellungen/EinstellungenTabNav'

export function EinstellungenLayoutClient({
  teamCount,
  children,
}: {
  teamCount: number
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const isHub = pathname === '/einstellungen'

  return (
    <div className="mx-auto max-w-[1100px]">
      {!isHub ? (
        <div className="-mx-4 md:mx-0">
          <EinstellungenTabNav teamCount={teamCount} />
        </div>
      ) : null}
      <div className="min-w-0 rounded-xl bg-app-grouped p-4 md:p-6">{children}</div>
    </div>
  )
}

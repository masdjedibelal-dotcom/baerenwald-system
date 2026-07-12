'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeEinstellungenTab, EINSTELLUNGEN_TABS } from '@/lib/einstellungen-tabs'
import { cn } from '@/lib/utils'

export function EinstellungenTabNav({ teamCount }: { teamCount?: number }) {
  const pathname = usePathname()
  const active = activeEinstellungenTab(pathname)

  return (
    <nav className="tabs mb-0 px-4 md:mb-5 md:px-0" aria-label="Einstellungen Bereiche">
      {EINSTELLUNGEN_TABS.map((tab) => {
        const isActive = tab.id === active
        const Icon = tab.icon
        const count = tab.id === 'team' && teamCount != null && teamCount > 0 ? teamCount : undefined
        return (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn('tab', isActive && 'active')}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {tab.label}
            {count !== undefined ? <span className="tab-count">{count}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}

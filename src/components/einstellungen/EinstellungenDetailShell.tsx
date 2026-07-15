'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { activeEinstellungenTab, EINSTELLUNGEN_TABS } from '@/lib/einstellungen-tabs'

export function EinstellungenDetailShell({
  teamCount,
  children,
}: {
  teamCount: number
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const active = activeEinstellungenTab(pathname)

  return (
    <div className="dshell">
      <nav className="dshell-nav" aria-label="Einstellungen">
        {EINSTELLUNGEN_TABS.map((tab) => {
          const isActive = tab.id === active
          const count = tab.id === 'team' && teamCount > 0 ? teamCount : undefined
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`dshell-navitem${isActive ? ' active' : ''}`}
            >
              <MockIcon n={tab.mockIcon} size={16} />
              <span>{tab.label}</span>
              {count != null ? <span className="dshell-count">{count}</span> : null}
            </Link>
          )
        })}
      </nav>
      <div className="dshell-body">
        <div className="dshell-group active">
          <div className="dshell-cards">{children}</div>
        </div>
      </div>
    </div>
  )
}

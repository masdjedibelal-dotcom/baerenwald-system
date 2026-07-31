'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useIsMobile } from '@/hooks/useIsMobile'
import { activeEinstellungenTab, EINSTELLUNGEN_TABS } from '@/lib/einstellungen-tabs'
import { cn } from '@/lib/utils'

export function EinstellungenDetailShell({
  teamCount,
  children,
}: {
  teamCount: number
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const active = activeEinstellungenTab(pathname)
  const isMobile = useIsMobile()
  const tabsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isMobile || !tabsRef.current) return
    const btn = tabsRef.current.querySelector<HTMLElement>(`[data-tab-id="${active}"]`)
    btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [active, isMobile])

  return (
    <div className={cn('dshell', isMobile && 'dshell--tabs-mobile')}>
      <nav
        ref={tabsRef}
        className={cn(isMobile ? 'dshell-tabs-mobile' : 'dshell-nav')}
        aria-label="Einstellungen"
        role="tablist"
      >
        {EINSTELLUNGEN_TABS.map((tab) => {
          const isActive = tab.id === active
          const count = tab.id === 'team' && teamCount > 0 ? teamCount : undefined
          return (
            <Link
              key={tab.id}
              href={tab.href}
              data-tab-id={tab.id}
              role="tab"
              aria-selected={isActive}
              className={cn(
                isMobile ? 'dshell-tab-mobile' : 'dshell-navitem',
                isActive && 'active'
              )}
            >
              {!isMobile ? <MockIcon ctx="nav" n={tab.mockIcon} size={16} /> : null}
              <span>{tab.label}</span>
              {!isMobile && count != null ? <span className="dshell-count">{count}</span> : null}
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

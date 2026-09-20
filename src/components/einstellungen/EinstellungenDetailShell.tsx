'use client'

import { MockTabs } from '@/components/mock-ui/MockTabs'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
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
      <MockTabs
        ref={tabsRef}
        items={EINSTELLUNGEN_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          href: tab.href,
          icon: tab.mockIcon,
          count: !isMobile && tab.id === 'team' && teamCount > 0 ? teamCount : undefined,
        }))}
        value={active}
        aria-label="Einstellungen"
        className={isMobile ? 'dshell-tabs-mobile' : 'dshell-nav'}
        tabClassName={isMobile ? 'dshell-tab-mobile' : 'dshell-navitem'}
        activeClassName="active"
        iconCtx="nav"
        showIcons={!isMobile}
      />
      <div className="dshell-body">
        <div className="dshell-group active">
          <div className="dshell-cards">{children}</div>
        </div>
      </div>
    </div>
  )
}

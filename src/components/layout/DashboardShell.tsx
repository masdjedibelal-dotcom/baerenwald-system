'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { MockNeuPopover } from '@/components/layout/MockNeuPopover'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { ToastProvider } from '@/components/ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export function DashboardShell({
  children,
  user,
  showDemoBanner,
}: {
  children: React.ReactNode
  user: User
  showDemoBanner: boolean
}) {
  const [neuOpen, setNeuOpen] = useState(false)
  const [sbCollapsed, setSbCollapsed] = useState(false)

  function openSearch() {
    document.dispatchEvent(new Event('open-search'))
  }

  return (
    <div className={cn('app', sbCollapsed && 'sb-collapsed')}>
      <Sidebar collapsed={sbCollapsed} onCollapsedChange={setSbCollapsed} user={user} />

      <div className="main">
        <TopBar user={user} onSearchOpen={openSearch} />

        <main className="page">
          <div className="page-inner">
            {showDemoBanner ? <DemoModeBanner /> : null}
            {children}
          </div>
        </main>
      </div>

      <BottomNav onNeuOpen={() => setNeuOpen(true)} />

      <div className="fab-wrap fab-desktop">
        <button
          type="button"
          className="fab-btn"
          title="Neu erstellen"
          aria-label="Neu erstellen"
          onClick={() => setNeuOpen(true)}
        >
          <MockIcon n="plus" size={26} />
        </button>
      </div>

      <MockNeuPopover open={neuOpen} onClose={() => setNeuOpen(false)} />
      <GlobalSearch />
      <ToastProvider />
    </div>
  )
}

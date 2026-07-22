'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { MockNeuPopover } from '@/components/layout/MockNeuPopover'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { ToastProvider } from '@/components/ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { AssistentProvider } from '@/components/assistent/AssistentProvider'
import { AssistentPanel } from '@/components/assistent/AssistentPanel'
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

  return (
    <AssistentProvider>
      <div className={cn('app', sbCollapsed && 'sb-collapsed')}>
        <Sidebar collapsed={sbCollapsed} onCollapsedChange={setSbCollapsed} user={user} />

        <div className="main">
          <TopBar user={user} />

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
            <MockIcon ctx="btn" n="plus" size={26} />
          </button>
        </div>

        <MockNeuPopover open={neuOpen} onClose={() => setNeuOpen(false)} />
        <AssistentPanel />
        <ToastProvider />
      </div>
    </AssistentProvider>
  )
}

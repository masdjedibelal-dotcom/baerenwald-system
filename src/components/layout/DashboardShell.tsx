'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { MockNeuPopover } from '@/components/layout/MockNeuPopover'
import { FabCreateHost } from '@/components/neu/FabCreateHost'
import { GlobalShortcuts } from '@/components/layout/GlobalShortcuts'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { ToastProvider } from '@/components/ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { AssistentProvider } from '@/components/assistent/AssistentProvider'
import { AssistentPanel } from '@/components/assistent/AssistentPanel'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { cn } from '@/lib/utils'

function ShellChrome({
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
  useKeyboardOpen()

  useEffect(() => {
    const openNeu = () => setNeuOpen(true)
    document.addEventListener('open-neu', openNeu)
    return () => document.removeEventListener('open-neu', openNeu)
  }, [])

  return (
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

      <div className="fab-wrap fab-desktop fab-create">
        <button
          type="button"
          className="fab-btn fab-create"
          title="Neu erstellen"
          aria-label="Neu erstellen"
          onClick={() => setNeuOpen(true)}
        >
          <MockIcon ctx="btn" n="plus" size={26} />
        </button>
      </div>

      <MockNeuPopover open={neuOpen} onClose={() => setNeuOpen(false)} />
      <FabCreateHost />
      <GlobalShortcuts onNeu={() => setNeuOpen(true)} />
      <AssistentPanel />
      <ToastProvider />
    </div>
  )
}

export function DashboardShell({
  children,
  user,
  showDemoBanner,
}: {
  children: React.ReactNode
  user: User
  showDemoBanner: boolean
}) {
  return (
    <AssistentProvider>
      <ShellChrome user={user} showDemoBanner={showDemoBanner}>
        {children}
      </ShellChrome>
    </AssistentProvider>
  )
}

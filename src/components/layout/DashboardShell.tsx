'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { MockNeuPopover } from '@/components/mock-ui/MockEntityRowMenu'
import { FabCreateHost } from '@/components/neu/FabCreateHost'
import { GlobalShortcuts } from '@/components/layout/GlobalShortcuts'
import { ToastProvider } from '@/components/ui'
import { AssistentProvider } from '@/components/assistent/AssistentProvider'
import { AssistentPanel } from '@/components/assistent/AssistentPanel'
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen'
import { cn } from '@/lib/utils'

function ShellChrome({
  children,
  user,
}: {
  children: React.ReactNode
  user: User
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
          <div className="page-inner">{children}</div>
        </main>
      </div>

      <BottomNav onNeuOpen={() => setNeuOpen(true)} />

      {/* Design 30.09.2026: kein schwebender Plus-Knopf mehr — „+“ oben in der Kopfleiste */}

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
}: {
  children: React.ReactNode
  user: User
}) {
  return (
    <AssistentProvider>
      <ShellChrome user={user}>{children}</ShellChrome>
    </AssistentProvider>
  )
}

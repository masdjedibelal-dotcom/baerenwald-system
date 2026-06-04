'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Mock `.toolbar` — Suche links, Aktionen rechts. */
export function ListToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('list-toolbar', className)}>
      {children}
    </div>
  )
}

export function ListToolbarSpacer() {
  return <div className="min-w-0 flex-1" aria-hidden />
}

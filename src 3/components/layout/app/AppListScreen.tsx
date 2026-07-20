'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Listen-Seiten: weißer Hintergrund wie Desktop, Filter sticky, Content scrollt. */
export function AppListScreen({
  children,
  filters,
  className,
}: {
  filters?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('app-list-screen', className)}>
      {filters ? <div className="app-list-filters">{filters}</div> : null}
      <div className="app-list-content">{children}</div>
    </div>
  )
}

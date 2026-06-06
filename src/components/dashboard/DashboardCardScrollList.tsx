'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Scroll-Container: zeigt ~3 Zeilen, Rest per Scroll in der Card. */
export function DashboardCardScrollList({
  children,
  tall = false,
  className,
}: {
  children: ReactNode
  /** Höhere Zeilen (z. B. Aufträge mit Fortschrittsbalken). */
  tall?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'dashboard-card-list-scroll overscroll-contain',
        tall && 'dashboard-card-list-scroll--tall',
        className
      )}
    >
      {children}
    </div>
  )
}

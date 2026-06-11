'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

  /** Scroll-Container: zeigt ~3 Zeilen, Rest per Scroll in der Card. */
export function DashboardCardScrollList({
  children,
  tall = false,
  /** Kein max-height — alle Einträge der Seite sichtbar, Pagination darunter. */
  paginated = false,
  className,
}: {
  children: ReactNode
  /** Höhere Zeilen (z. B. Aufträge mit Fortschrittsbalken). */
  tall?: boolean
  paginated?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'overscroll-contain',
        !paginated && 'dashboard-card-list-scroll',
        !paginated && tall && 'dashboard-card-list-scroll--tall',
        className
      )}
    >
      {children}
    </div>
  )
}

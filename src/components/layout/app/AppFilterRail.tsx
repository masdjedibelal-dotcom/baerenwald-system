'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** App-Store-artige horizontale Filter-/Sortier-Leiste (mobil). */
export function AppFilterRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'app-filter-rail flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {children}
    </div>
  )
}

export function AppFilterPill({
  children,
  className,
  active,
}: {
  children: ReactNode
  className?: string
  active?: boolean
}) {
  return (
    <div
      className={cn(
        'app-filter-pill shrink-0',
        active && 'app-filter-pill--active',
        className
      )}
    >
      {children}
    </div>
  )
}

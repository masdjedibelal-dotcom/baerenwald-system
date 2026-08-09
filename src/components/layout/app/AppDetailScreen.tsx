'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Detail-Seiten: Header-Slot + sticky Tab-Bar + scrollbarer Inhalt. */
export function AppDetailScreen({
  header,
  tabs,
  children,
  className,
}: {
  header?: ReactNode
  tabs?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('app-detail-screen space-y-3 pb-6', className)}>
      {header}
      {tabs ? <div className="app-detail-tabs sticky top-0 z-[2] bg-bw-bg py-1">{tabs}</div> : null}
      <div className="app-detail-body min-w-0 space-y-3">{children}</div>
    </div>
  )
}

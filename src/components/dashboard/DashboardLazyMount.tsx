'use client'

import type { ReactNode } from 'react'
import { useInViewOnce } from '@/hooks/useInViewOnce'
import { cn } from '@/lib/utils'

/** Rendert children erst, wenn der Block in/nahe dem Viewport ist. */
export function DashboardLazyMount({
  children,
  className,
  minHeight = 220,
}: {
  children: ReactNode
  className?: string
  minHeight?: number
}) {
  const { ref, inView } = useInViewOnce()

  return (
    <div
      ref={ref}
      className={cn('dash-lazy', className)}
      style={inView ? undefined : { minHeight }}
    >
      {inView ? children : <div className="dash-lazy-skel" aria-hidden />}
    </div>
  )
}

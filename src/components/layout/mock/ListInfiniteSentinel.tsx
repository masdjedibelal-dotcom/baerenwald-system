'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type ListInfiniteSentinelProps = {
  hasMore: boolean
  onLoadMore: () => void
  shown: number
  total: number
  unit?: string
  className?: string
}

/** Mobil: Sentinel am Listenende — lädt weitere Einträge per IntersectionObserver. */
export function ListInfiniteSentinel({
  hasMore,
  onLoadMore,
  shown,
  total,
  unit,
  className,
}: ListInfiniteSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !hasMore || total === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore()
      },
      { root: null, rootMargin: '280px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, onLoadMore, shown, total])

  if (total === 0) return null

  return (
    <div ref={ref} className={cn('list-infinite', className)} aria-live="polite">
      <p className="list-infinite__meta">
        {shown} von {total}
        {unit ? ` ${unit}` : ''}
        {hasMore ? ' · weiter scrollen…' : ''}
      </p>
    </div>
  )
}

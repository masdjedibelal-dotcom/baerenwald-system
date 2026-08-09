'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const THRESHOLD = 64

/**
 * Leichtes Pull-to-refresh für Mobile-Listen (Touch).
 * Desktop: rendert nur children.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  className?: string
}) {
  const startY = useRef(0)
  const pulling = useRef(false)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)

  const reset = useCallback(() => {
    pulling.current = false
    setOffset(0)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    if (busy) return
    const scrollParent = e.currentTarget
    if (scrollParent.scrollTop > 0) return
    startY.current = e.touches[0]?.clientY ?? 0
    pulling.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || busy) return
    const y = e.touches[0]?.clientY ?? 0
    const dy = y - startY.current
    if (dy <= 0) {
      setOffset(0)
      return
    }
    setOffset(Math.min(dy * 0.45, THRESHOLD + 24))
  }

  const onTouchEnd = async () => {
    if (!pulling.current) return
    const shouldRefresh = offset >= THRESHOLD
    pulling.current = false
    if (!shouldRefresh) {
      setOffset(0)
      return
    }
    setBusy(true)
    setOffset(40)
    try {
      await onRefresh()
    } finally {
      setBusy(false)
      reset()
    }
  }

  return (
    <div
      className={cn('pull-refresh', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
      onTouchCancel={reset}
    >
      <div
        className={cn('pull-refresh__hint', (offset > 8 || busy) && 'is-visible')}
        style={{ height: offset || (busy ? 40 : 0) }}
        aria-hidden
      >
        <span>{busy ? 'Aktualisiert…' : offset >= THRESHOLD ? 'Loslassen' : 'Ziehen zum Aktualisieren'}</span>
      </div>
      {children}
    </div>
  )
}

'use client'

import { useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'

const THRESHOLD = 72
const MAX = 112

/**
 * Spec §14 mobil: links Löschen, rechts Anrufen (Swipe).
 */
export function SwipeRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Löschen',
  rightLabel = 'Anrufen',
  className,
  disabled,
}: {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftLabel?: string
  rightLabel?: string
  className?: string
  disabled?: boolean
}) {
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<'x' | 'y' | null>(null)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || e.pointerType === 'mouse') return
    startX.current = e.clientX
    startY.current = e.clientY
    axis.current = null
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const mx = e.clientX - startX.current
    const my = e.clientY - startY.current
    if (!axis.current) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    }
    if (axis.current !== 'x') return
    let next = mx
    if (!onSwipeLeft && next < 0) next = 0
    if (!onSwipeRight && next > 0) next = 0
    setDx(Math.max(-MAX, Math.min(MAX, next)))
  }

  function end() {
    if (!dragging) return
    setDragging(false)
    if (dx <= -THRESHOLD && onSwipeLeft) {
      onSwipeLeft()
    } else if (dx >= THRESHOLD && onSwipeRight) {
      onSwipeRight()
    }
    setDx(0)
    axis.current = null
  }

  return (
    <div className={cn('swiperow', className)}>
      {onSwipeRight ? (
        <div className="swiperow-act right" aria-hidden>
          {rightLabel}
        </div>
      ) : null}
      {onSwipeLeft ? (
        <div className="swiperow-act left" aria-hidden>
          {leftLabel}
        </div>
      ) : null}
      <div
        className="swiperow-body"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : undefined,
          background:
            dx < 0
              ? 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--red-tx) 18%, transparent))'
              : dx > 0
                ? 'linear-gradient(270deg, transparent, color-mix(in srgb, var(--green) 18%, transparent))'
                : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
      </div>
    </div>
  )
}

'use client'

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn } from '@/lib/utils'

const THRESHOLD = 72
const MAX = 112
const AXIS_LOCK = 10

/**
 * Spec §14 mobil: links Löschen, rechts Anrufen (Swipe).
 * Aktionsflächen nur während echtem Horizontal-Swipe — sonst blitzen sie beim Listen-Scroll durch.
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
  const dxRef = useRef(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const revealing = dx !== 0 || (dragging && axis.current === 'x')

  useEffect(() => {
    dxRef.current = dx
  }, [dx])

  /** Vertikales Listen-Scroll bricht offenen Swipe ab */
  useEffect(() => {
    if (disabled) return
    const onScroll = () => {
      if (dxRef.current === 0 && !axis.current) return
      axis.current = null
      setDragging(false)
      setDx(0)
    }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [disabled])

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
      if (Math.abs(mx) < AXIS_LOCK && Math.abs(my) < AXIS_LOCK) return
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (axis.current === 'y') {
        // Scroll freigeben — kein Swipe
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
        setDragging(false)
        setDx(0)
        return
      }
    }
    if (axis.current !== 'x') return
    let next = mx
    if (!onSwipeLeft && next < 0) next = 0
    if (!onSwipeRight && next > 0) next = 0
    setDx(Math.max(-MAX, Math.min(MAX, next)))
  }

  function end(e?: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging && dxRef.current === 0) return
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
    const current = dxRef.current
    if (axis.current === 'x') {
      if (current <= -THRESHOLD && onSwipeLeft) onSwipeLeft()
      else if (current >= THRESHOLD && onSwipeRight) onSwipeRight()
    }
    setDx(0)
    axis.current = null
  }

  return (
    <div className={cn('swiperow', revealing && 'is-revealing', className)}>
      {revealing && onSwipeRight ? (
        <div className="swiperow-act right" aria-hidden>
          {rightLabel}
        </div>
      ) : null}
      {revealing && onSwipeLeft ? (
        <div className="swiperow-act left" aria-hidden>
          {leftLabel}
        </div>
      ) : null}
      <div
        ref={bodyRef}
        className="swiperow-body"
        style={{
          transform: dx !== 0 ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : undefined,
          touchAction: 'pan-y',
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

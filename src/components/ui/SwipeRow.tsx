'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { cn } from '@/lib/utils'

const AXIS_LOCK = 10
const THRESHOLD = 40
const BTN = 36
const GAP = 6
const PAD = 10
const CLOSE_EVENT = 'bw-swiperow-close'

export type SwipeIconTone = 'danger' | 'neutral' | 'accent' | 'primary'

export type SwipeIconAction = {
  icon: string
  label: string
  onClick: () => void
  tone?: SwipeIconTone
}

function openWidth(count: number): number {
  if (count <= 0) return 0
  return PAD * 2 + count * BTN + Math.max(0, count - 1) * GAP
}

/**
 * Mobil: Swipe öffnet kleine Icon-Aktionen.
 * Linke Seite (Swipe nach rechts) · Rechte Seite (Swipe nach links).
 */
export function SwipeRow({
  children,
  leftActions,
  rightActions,
  className,
  disabled,
}: {
  children: ReactNode
  /** Sichtbar auf der linken Seite (z. B. Löschen) */
  leftActions?: SwipeIconAction[]
  /** Sichtbar auf der rechten Seite (z. B. Bearbeiten + Kopieren) */
  rightActions?: SwipeIconAction[]
  className?: string
  disabled?: boolean
}) {
  const left = leftActions ?? []
  const right = rightActions ?? []
  const openL = useMemo(() => openWidth(left.length), [left.length])
  const openR = useMemo(() => openWidth(right.length), [right.length])

  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<'x' | 'y' | null>(null)
  const dxRef = useRef(0)
  const openRef = useRef(0)
  const rowId = useRef(`sr-${Math.random().toString(36).slice(2)}`)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)

  const revealing = dx !== 0 || (dragging && axis.current === 'x')

  useEffect(() => {
    dxRef.current = dx
  }, [dx])

  useEffect(() => {
    if (disabled) return
    const onScroll = () => {
      if (dxRef.current === 0 && !axis.current) return
      axis.current = null
      openRef.current = 0
      setDragging(false)
      setDx(0)
    }
    const onCloseOthers = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id === rowId.current) return
      if (dxRef.current === 0) return
      openRef.current = 0
      setDx(0)
    }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener(CLOSE_EVENT, onCloseOthers)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener(CLOSE_EVENT, onCloseOthers)
    }
  }, [disabled])

  function announceOpen() {
    window.dispatchEvent(new CustomEvent(CLOSE_EVENT, { detail: rowId.current }))
  }

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
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
        setDragging(false)
        return
      }
    }
    if (axis.current !== 'x') return
    let next = openRef.current + mx
    if (!left.length && next > 0) next = 0
    if (!right.length && next < 0) next = 0
    setDx(Math.max(-openR || 0, Math.min(openL || 0, next)))
  }

  function end(e?: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging && dxRef.current === 0) return
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setDragging(false)
    const current = dxRef.current
    if (axis.current === 'x') {
      let next = 0
      if (current > THRESHOLD && left.length) next = openL
      else if (current < -THRESHOLD && right.length) next = -openR
      else if (Math.abs(current) > Math.abs(openRef.current) / 2) {
        next = current > 0 && left.length ? openL : current < 0 && right.length ? -openR : 0
      }
      if (next !== 0) announceOpen()
      openRef.current = next
      setDx(next)
    }
    axis.current = null
  }

  function close() {
    openRef.current = 0
    setDx(0)
  }

  function runAction(action: SwipeIconAction) {
    close()
    queueMicrotask(() => action.onClick())
  }

  return (
    <div className={cn('swiperow', revealing && 'is-revealing', className)}>
      {left.length > 0 ? (
        <div
          className="swiperow-act swiperow-act--start"
          aria-hidden={!revealing || dx <= 0}
        >
          {left.map((a) => (
            <button
              key={a.label}
              type="button"
              className={cn('swiperow-act-btn', `tone-${a.tone ?? 'neutral'}`)}
              aria-label={a.label}
              tabIndex={dx > 0 ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation()
                runAction(a)
              }}
            >
              <ActionIcon n={a.icon} size={16} />
            </button>
          ))}
        </div>
      ) : null}
      {right.length > 0 ? (
        <div
          className="swiperow-act swiperow-act--end"
          aria-hidden={!revealing || dx >= 0}
        >
          {right.map((a) => (
            <button
              key={a.label}
              type="button"
              className={cn('swiperow-act-btn', `tone-${a.tone ?? 'neutral'}`)}
              aria-label={a.label}
              tabIndex={dx < 0 ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation()
                runAction(a)
              }}
            >
              <ActionIcon n={a.icon} size={16} />
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="swiperow-body"
        style={{
          transform: dx !== 0 ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : undefined,
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (dxRef.current === 0) return
          e.preventDefault()
          e.stopPropagation()
          close()
        }}
      >
        {children}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export function MockPopover({
  open,
  onClose,
  anchorRef,
  children,
  align = 'right',
  width = 210,
}: {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  align?: 'left' | 'right'
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const w = width
      let left = align === 'right' ? r.right - w : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      let top = r.bottom + 6
      if (top + 260 > window.innerHeight) top = Math.max(8, r.top - 6 - 260)
      setPos({ top, left, width: w })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, align, width, anchorRef])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const anchor = anchorRef.current
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchor &&
        !anchor.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [open, onClose, anchorRef])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={ref}
      className="popover"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}

export type MockPopoverItem =
  | 'sep'
  | { icon?: string; label: string; danger?: boolean; onClick: () => void }

export function MockPopoverMenu({
  items,
  iconFn,
  onItemClick,
}: {
  items: MockPopoverItem[]
  iconFn: (name: string) => ReactNode
  onItemClick?: () => void
}) {
  return (
    <>
      {items.map((it, i) =>
        it === 'sep' ? (
          <div key={`sep-${i}`} className="pop-sep" />
        ) : (
          <button
            key={it.label}
            type="button"
            className={cn('pop-item', it.danger && 'danger')}
            onClick={() => {
              onItemClick?.()
              it.onClick()
            }}
          >
            {it.icon ? iconFn(it.icon) : <span style={{ width: 18 }} />}
            <span>{it.label}</span>
          </button>
        )
      )}
    </>
  )
}

'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ActionSheet } from '@/components/ui/ActionSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/** Desktop: Mock-`.menu` / `.menu-item` (1:1 Standalone Menu). Mobile: ActionSheet. */

export type ActionsMenuItem =
  | 'sep'
  | {
      label: string
      icon?: ReactNode
      hint?: string
      danger?: boolean
      onClick: () => void
    }

const MENU_MIN_WIDTH = 240

export function ActionsMenu({
  trigger,
  items,
  align = 'right',
  sheetTitle = 'Aktionen',
}: {
  trigger: ReactNode
  items: ActionsMenuItem[]
  align?: 'left' | 'right'
  sheetTitle?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || isMobile || !wrapRef.current) return
    const update = () => {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const w = Math.max(MENU_MIN_WIDTH, menuRef.current?.offsetWidth ?? MENU_MIN_WIDTH)
      let left = align === 'right' ? r.right - w : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      let top = r.bottom + 4
      const approxH = menuRef.current?.offsetHeight ?? 120
      if (top + approxH > window.innerHeight - 8) {
        top = Math.max(8, r.top - 4 - approxH)
      }
      setPos({ top, left })
    }
    update()
    // Nach erstem Paint nochmal messen (echte Menübreite)
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, isMobile, align, items])

  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!isMobile) return
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, isMobile])

  const menuNodes = items.map((it, i) => {
    if (it === 'sep') return <div key={`sep-${i}`} className="menu-sep" role="separator" />
    return (
      <button
        key={it.label}
        type="button"
        role="menuitem"
        className={cn('menu-item', it.danger && 'danger')}
        onClick={() => {
          setOpen(false)
          it.onClick()
        }}
      >
        {it.icon ? <span className="menu-item-ico">{it.icon}</span> : <span style={{ width: 18 }} />}
        <span>{it.label}</span>
        {it.hint ? <span className="menu-item-hint">{it.hint}</span> : null}
      </button>
    )
  })

  const portalMenu =
    open && !isMobile && mounted && pos
      ? createPortal(
          <div
            ref={menuRef}
            className="menu menu--portal"
            style={{ top: pos.top, left: pos.left, right: 'auto' }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {menuNodes}
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div ref={wrapRef} className="menu-wrap">
        <span
          role="button"
          tabIndex={0}
          className="inline-flex"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen((o) => !o)
            }
          }}
        >
          {trigger}
        </span>
      </div>

      {portalMenu}

      {isMobile ? (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={sheetTitle}
          items={items}
        />
      ) : null}
    </>
  )
}

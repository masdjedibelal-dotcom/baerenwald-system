'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover, MockPopoverMenu, type MockPopoverItem } from '@/components/mock-ui/MockPopover'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { openFabCreate, type FabOverlayArt } from '@/components/neu/FabCreateHost'
import { showOverlayBusy } from '@/components/ui/action-busy'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { COPY_ROLE } from '@/lib/copy'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ActionSheet } from '@/components/ui/ActionSheet'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { cn } from '@/lib/utils'

function toPopoverItems(items: EntityMenuItem[]): MockPopoverItem[] {
  return items.map((it) => {
    if (it === 'sep') return 'sep'
    return {
      icon: it.icon,
      label: it.label,
      danger: it.danger,
      disabled: it.disabled,
      hint: it.hint,
      onClick: it.onClick,
    }
  })
}

function toActionsMenuItems(items: EntityMenuItem[]): ActionsMenuItem[] {
  return items.map((it) => {
    if (it === 'sep') return 'sep'
    return {
      label: it.label,
      hint: it.hint,
      danger: it.danger,
      disabled: it.disabled,
      icon: it.icon ? <MockIcon ctx="row" n={it.icon} size={15} /> : undefined,
      onClick: it.onClick,
    }
  })
}

/** Zeilen-⋯ — kanonisches CRM-Menü (P5-7). */
export function MockEntityRowMenu({
  items,
  title = 'Aktionen',
}: {
  items: EntityMenuItem[]
  title?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLSpanElement>(null)

  if (!items.length) return null

  return (
    <>
      <span ref={anchorRef} style={{ display: 'inline-flex' }}>
        <button
          type="button"
          className="qa-btn"
          title={title}
          aria-label={title}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
        >
          <MockIcon ctx="row" n="dots" size={16} />
        </button>
      </span>
      {isMobile ? (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          items={toActionsMenuItems(items)}
        />
      ) : (
        <MockPopover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right">
          <MockPopoverMenu
            items={toPopoverItems(items)}
            iconFn={(n) => <MockIcon ctx="row" n={n} size={15} />}
            onItemClick={() => setOpen(false)}
          />
        </MockPopover>
      )}
    </>
  )
}

export type ListbarActionItem = {
  icon: string
  label: string
  hint?: string
  active?: boolean
  danger?: boolean
  onSelect: () => void
}

/**
 * Listen-Toolbar (Filter/Export) — Desktop-Buttons + Mobil-Overflow.
 * Liegt bewusst in dieser Datei (P5-7 Audit-Exempt für Popover-Menü).
 */
export function MockListbarChrome({
  items,
  activeHint,
  desktop,
  leading,
  title = 'Aktionen',
  directOpen,
}: {
  items: ListbarActionItem[]
  activeHint?: number
  desktop: ReactNode
  leading?: ReactNode
  title?: string
  directOpen?: () => void
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const hasActive = (activeHint ?? 0) > 0 || items.some((i) => i.active)

  const runSelect = (it: ListbarActionItem) => {
    setOpen(false)
    queueMicrotask(() => it.onSelect())
  }

  const popItems: MockPopoverItem[] = items.map((it) => ({
    icon: it.icon,
    label: it.hint ? `${it.label} · ${it.hint}` : it.label,
    danger: it.danger,
    onClick: () => runSelect(it),
  }))

  const sheetItems: ActionsMenuItem[] = items.map((it) => ({
    label: it.label,
    hint: it.hint,
    danger: it.danger,
    icon: <MockIcon ctx="btn" n={it.icon} size={16} />,
    onClick: () => runSelect(it),
  }))

  const onMobileTrigger = () => {
    if (directOpen) {
      directOpen()
      return
    }
    setOpen((v) => !v)
  }

  return (
    <div className="listbar-actions">
      {leading ? <div className="listbar-actions-leading">{leading}</div> : null}
      <div className="listbar-actions-desktop">{desktop}</div>
      <div className="listbar-actions-mobile">
        <button
          ref={anchorRef}
          type="button"
          className={cn('btn sm icon', hasActive ? 'primary' : 'ghost')}
          title={directOpen ? 'Filter & Suchen' : title}
          aria-label={directOpen ? 'Filter & Suchen' : title}
          aria-expanded={directOpen ? undefined : open}
          aria-haspopup={directOpen ? undefined : 'menu'}
          onClick={onMobileTrigger}
        >
          <MockIcon ctx="btn" n="filter" size={14} />
        </button>
        {activeHint && activeHint > 0 ? (
          <span className="listbar-actions-badge" aria-hidden>
            {activeHint > 9 ? '9+' : activeHint}
          </span>
        ) : null}
        {directOpen ? null : isMobile ? (
          <ActionSheet open={open} onClose={() => setOpen(false)} title={title} items={sheetItems} />
        ) : (
          <MockPopover
            open={open}
            onClose={() => setOpen(false)}
            anchorRef={anchorRef}
            align="right"
            width={248}
          >
            <div className="pop-h">{title}</div>
            <MockPopoverMenu
              items={popItems}
              iconFn={(n) => <MockIcon ctx="btn" n={n} size={16} />}
            />
          </MockPopover>
        )}
      </div>
    </div>
  )
}

const MENU_MIN_WIDTH = 240

/**
 * Detail-Overflow (⋯) mit Custom-Trigger — ersetzt Legacy-ActionsMenu (P5-7).
 */
export function MockDetailOverflowMenu({
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
        disabled={it.disabled}
        title={it.disabled && it.hint ? it.hint : undefined}
        className={cn('menu-item', it.danger && 'danger', it.disabled && 'opacity-50')}
        onClick={() => {
          if (it.disabled) return
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
        <ActionSheet open={open} onClose={() => setOpen(false)} title={sheetTitle} items={items} />
      ) : null}
    </>
  )
}

type NeuItem = { ic: string; label: string; overlay: FabOverlayArt }

/** FAB: Overlay auf aktueller Seite (kein /anfragen/neu-Host). */
const VORGANG_ITEMS: NeuItem[] = [
  { ic: 'inbox', label: 'Anfrage', overlay: 'anfrage' },
  { ic: 'file-invoice', label: 'Angebot', overlay: 'angebot' },
  { ic: 'receipt', label: 'Rechnung', overlay: 'rechnung' },
]

const STAMM_ITEMS: NeuItem[] = [
  { ic: 'users', label: 'Kunde', overlay: 'kunde' },
  { ic: 'tool', label: COPY_ROLE.partner, overlay: 'handwerker' },
]

const PLAN_ITEMS: NeuItem[] = [
  { ic: 'calendar-event', label: 'Termin', overlay: 'termin' },
  { ic: 'clipboard-list', label: 'To-do', overlay: 'todo' },
]

const BUSY_LABEL: Record<FabOverlayArt, string> = {
  anfrage: 'Anfrage wird geöffnet…',
  angebot: 'Angebot wird geöffnet…',
  rechnung: 'Rechnung wird geöffnet…',
  kunde: 'Kunde wird geöffnet…',
  handwerker: `${COPY_ROLE.partner} wird geöffnet…`,
  termin: 'Termin wird geöffnet…',
  todo: 'To-do wird geöffnet…',
}

/** FAB „Neu erstellen“ — kanonisch neben MockEntityRowMenu (Menü-Konsolidierung). */
export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayChromeLock(open)

  if (!open) return null

  function go(item: NeuItem) {
    showOverlayBusy(BUSY_LABEL[item.overlay])
    onClose()
    openFabCreate(item.overlay)
  }

  return (
    <div className="neu-pop-overlay" onClick={onClose} role="presentation">
      <div
        className="neu-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Neu erstellen"
      >
        <div className="neu-pop-handle" aria-hidden>
          <span />
        </div>
        <div className="neu-pop-head">Neu erstellen</div>
        {VORGANG_ITEMS.map((it) => (
          <MockBtn className="neu-pop-item" key={it.label} type="button" onClick={() => go(it)}>
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
            </span>
          </MockBtn>
        ))}
        <div className="neu-pop-sep" />
        {STAMM_ITEMS.map((it) => (
          <MockBtn className="neu-pop-item" key={it.label} type="button" onClick={() => go(it)}>
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
            </span>
          </MockBtn>
        ))}
        <div className="neu-pop-sep" />
        {PLAN_ITEMS.map((it) => (
          <MockBtn className="neu-pop-item" key={it.label} type="button" onClick={() => go(it)}>
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
            </span>
          </MockBtn>
        ))}
        <MockBtn className="neu-pop-cancel md:hidden" type="button" onClick={onClose}>
          Abbrechen
        </MockBtn>
      </div>
    </div>
  )
}

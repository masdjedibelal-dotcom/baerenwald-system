'use client'

import { useRef, useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover, MockPopoverMenu, type MockPopoverItem } from '@/components/mock-ui/MockPopover'
import { cn } from '@/lib/utils'

export type ListbarActionItem = {
  icon: string
  label: string
  /** Kurzinfo im Menü (z. B. aktueller Toggle-Stand) */
  hint?: string
  active?: boolean
  danger?: boolean
  onSelect: () => void
}

/**
 * Mobil: ein Filter-Icon → Popover mit Aktionen.
 * Desktop: `desktop` unverändert (Segment, Filter, Export, …).
 */
export function ListbarActionsMenu({
  items,
  activeHint,
  desktop,
  title = 'Aktionen',
}: {
  items: ListbarActionItem[]
  /** Badge am Icon (z. B. aktive Filteranzahl) */
  activeHint?: number
  desktop: ReactNode
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const hasActive = (activeHint ?? 0) > 0 || items.some((i) => i.active)

  const popItems: MockPopoverItem[] = items.map((it) => ({
    icon: it.icon,
    label: it.hint ? `${it.label} · ${it.hint}` : it.label,
    danger: it.danger,
    onClick: () => {
      setOpen(false)
      // Nach Popover-Close, damit Sheet/Modal zuverlässig öffnet
      queueMicrotask(() => it.onSelect())
    },
  }))

  return (
    <div className="listbar-actions">
      <div className="listbar-actions-desktop">{desktop}</div>
      <div className="listbar-actions-mobile">
        <button
          ref={anchorRef}
          type="button"
          className={cn('btn sm icon', hasActive ? 'primary' : 'ghost')}
          title={title}
          aria-label={title}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <MockIcon ctx="btn" n="filter" size={14} />
        </button>
        {activeHint && activeHint > 0 ? (
          <span className="listbar-actions-badge" aria-hidden>
            {activeHint > 9 ? '9+' : activeHint}
          </span>
        ) : null}
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
      </div>
    </div>
  )
}

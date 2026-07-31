'use client'

import { useRef, useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover, MockPopoverMenu, type MockPopoverItem } from '@/components/mock-ui/MockPopover'
import { ActionSheet } from '@/components/ui/ActionSheet'
import type { ActionsMenuItem } from '@/components/ui/actions-menu'
import { useIsMobile } from '@/hooks/useIsMobile'
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
 * Mobil: optional `leading` + Filter-Icon.
 * Mit `directOpen`: Icon öffnet direkt (z. B. Filter-Sheet), ohne ActionSheet-Zwischenschritt.
 * Desktop: `desktop` unverändert.
 */
export function ListbarActionsMenu({
  items,
  activeHint,
  desktop,
  leading,
  title = 'Aktionen',
  directOpen,
}: {
  items: ListbarActionItem[]
  /** Badge am Icon (z. B. aktive Filteranzahl) */
  activeHint?: number
  desktop: ReactNode
  /** Mobil links neben dem Filter-Icon (z. B. Segment-Toggle) */
  leading?: ReactNode
  title?: string
  /** Mobil: Icon öffnet direkt diese Aktion statt Listen-Aktionen-Sheet */
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
      <div className="listbar-actions-desktop">{desktop}</div>
      <div className="listbar-actions-mobile">
        {leading ? <div className="listbar-actions-leading">{leading}</div> : null}
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
          <ActionSheet
            open={open}
            onClose={() => setOpen(false)}
            title={title}
            items={sheetItems}
          />
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

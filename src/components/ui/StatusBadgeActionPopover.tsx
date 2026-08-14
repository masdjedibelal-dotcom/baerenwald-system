'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover } from '@/components/mock-ui/MockPopover'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type StatusBadgeAction = {
  id: string
  label: string
  icon?: string
  danger?: boolean
  onClick: () => void
}

/**
 * Status-Badge mit Popover (Desktop) bzw. ActionSheet (Mobil) für Statuswechsel.
 */
export function StatusBadgeActionPopover({
  badge,
  actions,
  title = 'Status',
}: {
  badge: ReactNode
  actions: StatusBadgeAction[]
  title?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  if (!actions.length) return <>{badge}</>

  if (isMobile) {
    const items: ActionsMenuItem[] = actions.map((a) => ({
      label: a.label,
      danger: a.danger,
      icon: a.icon ? <MockIcon ctx="btn" n={a.icon} size={16} /> : undefined,
      onClick: a.onClick,
    }))
    /* Kein nested <button> — ActionsMenu-Trigger ist bereits klickbar. */
    const trigger = (
      <span
        className="status-badge-action-pop__trigger status-badge-action-pop__trigger--with-caret"
        aria-label={`${title} ändern`}
      >
        {badge}
        <ActionIcon n="chevron-down" size={14} className="status-badge-action-pop__caret" />
      </span>
    )
    return (
      <div className="status-badge-action-pop">
        <ActionsMenu trigger={trigger} items={items} sheetTitle={title} align="left" />
      </div>
    )
  }

  return (
    <div className="status-badge-action-pop">
      <button
        ref={anchorRef}
        type="button"
        className={cn('status-badge-action-pop__trigger', open && 'is-open')}
        aria-label={`${title} ändern`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        {badge}
        <ActionIcon n="chevron-down" size={14} className="status-badge-action-pop__caret" />
      </button>
      <MockPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        width={220}
      >
        <div className="pop-h">{title}</div>
        <div role="menu" aria-label={title}>
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              className={cn('pop-item', a.danger && 'danger')}
              onClick={() => {
                setOpen(false)
                a.onClick()
              }}
            >
              {a.icon ? <MockIcon ctx="btn" n={a.icon} size={16} /> : null}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </MockPopover>
    </div>
  )
}

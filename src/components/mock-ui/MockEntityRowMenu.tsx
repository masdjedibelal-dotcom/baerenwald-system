'use client'

import { useRef, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  MockPopover,
  MockPopoverMenu,
  type MockPopoverItem,
} from '@/components/mock-ui/MockPopover'
import type { EntityMenuItem } from '@/lib/entity-menu'

function toPopoverItems(items: EntityMenuItem[]): MockPopoverItem[] {
  return items.map((it) => {
    if (it === 'sep') return 'sep'
    return {
      icon: it.icon,
      label: it.label,
      danger: it.danger,
      onClick: it.onClick,
    }
  })
}

export function MockEntityRowMenu({
  items,
  title = 'Aktionen',
}: {
  items: EntityMenuItem[]
  title?: string
}) {
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
          <MockIcon n="dots" size={16} />
        </button>
      </span>
      <MockPopover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right">
        <MockPopoverMenu
          items={toPopoverItems(items)}
          iconFn={(n) => <MockIcon n={n} size={15} />}
          onItemClick={() => setOpen(false)}
        />
      </MockPopover>
    </>
  )
}

'use client'

import { useRef, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover } from '@/components/mock-ui/MockPopover'
import { cn } from '@/lib/utils'

export type ZeitraumOption<T extends string = string> = {
  id: T
  label: string
}

/**
 * Zeitraum immer als Icon rechts + Popover — nie als Tabs/Segment.
 */
export function ZeitraumIconPopover<T extends string>({
  value,
  options,
  onChange,
  title = 'Zeitraum',
}: {
  value: T
  options: readonly ZeitraumOption<T>[]
  onChange: (id: T) => void
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const activeLabel = options.find((o) => o.id === value)?.label ?? title

  return (
    <div className="zeitraum-icon-pop">
      <button
        ref={anchorRef}
        type="button"
        className={cn('btn sm icon ghost zeitraum-icon-pop__btn', open && 'is-open')}
        title={`${title}: ${activeLabel}`}
        aria-label={`${title}: ${activeLabel}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <MockIcon ctx="btn" n="calendar" size={15} />
      </button>
      <MockPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="right"
        width={200}
      >
        <div className="pop-h">{title}</div>
        <div role="listbox" aria-label={title}>
          {options.map((opt) => {
            const active = opt.id === value
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn('pop-item', active && 'is-active')}
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}
              >
                <MockIcon ctx="btn" n={active ? 'check' : 'calendar'} size={16} />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </MockPopover>
    </div>
  )
}

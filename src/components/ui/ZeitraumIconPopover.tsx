'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover } from '@/components/mock-ui/MockPopover'
import { useRef, useState } from 'react'
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
      <MockBtn kind="ghost" sm className={cn('icon zeitraum-icon-pop__btn', open && 'is-open')} ref={anchorRef} type="button" title={`${title}: ${activeLabel}`} aria-label={`${title}: ${activeLabel}`} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((v) => !v)}>
        <MockIcon ctx="btn" n="calendar" size={15} />
      </MockBtn>
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
              <MockBtn className={cn('pop-item', active && 'is-active')} key={opt.id} type="button" role="option" aria-selected={active} onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}>
                <MockIcon ctx="btn" n={active ? 'check' : 'calendar'} size={16} />
                <span>{opt.label}</span>
              </MockBtn>
            )
          })}
        </div>
      </MockPopover>
    </div>
  )
}

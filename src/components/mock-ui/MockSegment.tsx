'use client'

import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type MockSegmentOption<T extends string = string> = {
  value: T
  label: ReactNode
  /** Extra-Klasse pro Option (z. B. Status-Farben) */
  className?: string
}

/**
 * Kanonisches Segmented Control (Zahlfrist, Status-Toggle, Modus-Seg).
 * Einzige Segment-Variante — Ziel audit `segment_varianten=1`.
 */
export function MockSegment<T extends string>({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  activeClassName = 'on',
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<MockSegmentOption<T>>
  /** Default: `.seg` (Mock Zahlfrist). Abnahme: `pos-segmented …` */
  className?: string
  /** Zusätzliche Klasse auf jedem Button */
  buttonClassName?: string
  /** Aktive Klasse — Default `on` (`.seg button.on`) */
  activeClassName?: string
  'aria-label'?: string
}) {
  return (
    <div className={cn('seg', className)} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <MockBtn
            key={o.value}
            type="button"
            className={cn(
              buttonClassName,
              o.className,
              active && activeClassName
            )}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </MockBtn>
        )
      })}
    </div>
  )
}

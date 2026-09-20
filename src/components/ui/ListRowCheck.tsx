'use client'

import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import type { MouseEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * Zeilen-/Header-Auswahl — MockCheckbox intern (AUFTRAG C2 / P5-17).
 */
export function ListRowCheck({
  checked,
  partial,
  onToggle,
  title,
  className,
}: {
  checked: boolean
  partial?: boolean
  onToggle: () => void
  title?: string
  className?: string
}) {
  return (
    <label
      className={cn('vg-check', className)}
      title={title}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      <MockCheckbox
        checked={checked}
        indeterminate={Boolean(partial) && !checked}
        aria-label={title ?? (checked ? 'Auswahl aufheben' : 'Auswählen')}
        onChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  )
}

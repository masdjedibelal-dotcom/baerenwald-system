'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Zeilen-/Header-Auswahl — echter Button (kein div-onClick).
 * Ersetzt nackte `.vg-check`-divs (AUFTRAG C2).
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
  function activate(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation()
    e.preventDefault()
    onToggle()
  }

  return (
    <button
      type="button"
      className={cn('vg-check', className)}
      title={title}
      aria-label={title ?? (checked ? 'Auswahl aufheben' : 'Auswählen')}
      aria-pressed={checked}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') activate(e)
      }}
    >
      <span className={cn('vg-box', checked && 'on', !checked && partial && 'partial')}>
        {checked || partial ? <MockIcon ctx="default" n="check" size={12} /> : null}
      </span>
    </button>
  )
}

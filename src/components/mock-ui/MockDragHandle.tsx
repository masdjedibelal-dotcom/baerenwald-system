'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Drag-Handle für Sortable-Listen (dnd-kit) — raw button + Spread für listeners.
 * P5-4 Kanon (Allowlist), analog Tabs/Chips.
 */
export function MockDragHandle({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'touch-none cursor-grab text-bw-text-muted active:cursor-grabbing hover:text-bw-text',
        className
      )}
      title={props.title ?? 'Ziehen zum Sortieren'}
      aria-label={props['aria-label'] ?? props.title ?? 'Ziehen zum Sortieren'}
      {...props}
    >
      {children ?? <MockIcon n="grip-vertical" ctx="default" className="h-5 w-5" aria-hidden />}
    </button>
  )
}

'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Kompakte Von/Bis-Zeile — bleibt auch mobil 2-spaltig (kein form-grid-Stack).
 */
export function FilterRangeRow({
  title,
  vonLabel = 'Von',
  bisLabel = 'Bis',
  von,
  bis,
  className,
}: {
  title: string
  vonLabel?: string
  bisLabel?: string
  von: ReactNode
  bis: ReactNode
  className?: string
}) {
  return (
    <div className={cn('filter-range', className)}>
      <div className="filter-range__title">{title}</div>
      <label className="field filter-range__field">
        <span className="field-lbl">{vonLabel}</span>
        {von}
      </label>
      <label className="field filter-range__field">
        <span className="field-lbl">{bisLabel}</span>
        {bis}
      </label>
    </div>
  )
}

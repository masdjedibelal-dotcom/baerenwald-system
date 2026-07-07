'use client'

import type { SortDir } from '@/hooks/useSort'
import { LIST_FILTER_PILL_SELECT_CLASS, LIST_FILTER_SELECT_CLASS } from '@/lib/list-filter-ui'
import { cn } from '@/lib/utils'

interface MobileSortSelectProps {
  options: { field: string; label: string }[]
  currentField: string | null
  currentDir: SortDir
  onSort: (field: string) => void
  /** `pill` für AppFilterRail; `toolbar` Legacy-Zeile unter Filtern */
  variant?: 'toolbar' | 'pill'
}

export function MobileSortSelect({
  options,
  currentField,
  currentDir,
  onSort,
  variant = 'toolbar',
}: MobileSortSelectProps) {
  const select = (
    <select
      value={currentField ?? ''}
      onChange={(e) => onSort(e.target.value)}
      aria-label="Sortieren"
      className={
        variant === 'pill'
          ? cn(LIST_FILTER_SELECT_CLASS, LIST_FILTER_PILL_SELECT_CLASS)
          : cn(LIST_FILTER_SELECT_CLASS, 'w-full max-w-none border-0 bg-transparent shadow-none ring-0 focus:ring-0')
      }
    >
      <option value="">Sortieren</option>
      {options.map((o) => (
        <option key={o.field} value={o.field}>
          {o.label}
          {currentField === o.field ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ''}
        </option>
      ))}
    </select>
  )

  if (variant === 'pill') return select

  return (
    <div className="flex items-center gap-2 border-b border-bw-border bg-bw-bg px-4 py-2 md:hidden">
      <span className="shrink-0 text-[13px] text-bw-text-muted">Sortieren:</span>
      {select}
    </div>
  )
}

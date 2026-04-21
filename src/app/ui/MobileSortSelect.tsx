'use client'

import type { SortDir } from '@/hooks/useSort'

interface MobileSortSelectProps {
  options: { field: string; label: string }[]
  currentField: string | null
  currentDir: SortDir
  onSort: (field: string) => void
}

export function MobileSortSelect({
  options,
  currentField,
  currentDir,
  onSort,
}: MobileSortSelectProps) {
  return (
    <div className="flex items-center gap-2 border-b border-bw-border bg-bw-bg px-4 py-2 md:hidden">
      <span className="flex-shrink-0 text-xs text-bw-text-muted">Sortieren:</span>
      <select
        value={currentField ?? ''}
        onChange={(e) => onSort(e.target.value)}
        className="flex-1 border-none bg-transparent text-xs text-bw-text outline-none"
      >
        <option value="">Standard</option>
        {options.map((o) => (
          <option key={o.field} value={o.field}>
            {o.label}
            {currentField === o.field ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { SortDir } from '@/hooks/useSort'

interface SortableHeaderProps {
  label: string
  field: string
  currentField: string | null
  currentDir: SortDir
  onSort: (field: string) => void
  className?: string
}

export function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentField === field
  const dir = isActive ? currentDir : null

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-bw-text ${
        isActive ? 'text-bw-primary' : 'text-bw-text-muted'
      } ${className}`}
    >
      {label}
      <span className="flex-shrink-0">
        {dir === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : dir === 'desc' ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </button>
  )
}

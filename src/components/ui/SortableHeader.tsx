'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
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
    <MockBtn className={`flex items-center gap-1 text-fs-caption font-semibold uppercase tracking-[0.04em] transition-colors hover:text-bw-text ${
        isActive ? 'text-bw-primary' : 'text-bw-text-muted'
      } ${className}`} type="button" onClick={() => onSort(field)}>
      {label}
      <span className="flex-shrink-0">
        {dir === 'asc' ? (
          <MockIcon n="arrow-up" ctx="default" className="h-3 w-3" />
        ) : dir === 'desc' ? (
          <MockIcon n="arrow-down" ctx="default" className="h-3 w-3" />
        ) : (
          <MockIcon n="arrows-exchange" ctx="default" className="h-3 w-3 opacity-[0.35]" />
        )}
      </span>
    </MockBtn>
  )
}

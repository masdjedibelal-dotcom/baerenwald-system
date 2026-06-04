'use client'

import { Search } from 'lucide-react'
import { LIST_FILTER_SEARCH_CLASS } from '@/lib/list-filter-ui'
import { cn } from '@/lib/utils'

export type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Volle Breite in der Filter-Zeile */
  flex?: boolean
  'aria-label'?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Suchen…',
  className,
  flex = false,
  'aria-label': ariaLabel = 'Suche',
}: SearchInputProps) {
  return (
    <label className={cn(LIST_FILTER_SEARCH_CLASS, flex && 'w-full max-w-none', className)}>
      <Search aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </label>
  )
}

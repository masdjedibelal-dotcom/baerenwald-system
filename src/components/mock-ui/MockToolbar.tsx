'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'

export function MockToolbar({
  query,
  onQueryChange,
  placeholder,
  onFilterClick,
  onExportClick,
  end,
}: {
  query: string
  onQueryChange: (v: string) => void
  placeholder: string
  onFilterClick?: () => void
  onExportClick?: () => void
  end?: ReactNode
}) {
  return (
    <div className="toolbar">
      <div className="input" style={{ flex: 1, maxWidth: 360 }}>
        <MockIcon n="search" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div style={{ flex: 1 }} />
      {onFilterClick ? (
        <MockBtn icon="filter" kind="ghost" sm onClick={onFilterClick}>
          Filter
        </MockBtn>
      ) : null}
      {onExportClick ? (
        <MockBtn icon="download" kind="ghost" sm onClick={onExportClick}>
          Export
        </MockBtn>
      ) : null}
      {end}
    </div>
  )
}

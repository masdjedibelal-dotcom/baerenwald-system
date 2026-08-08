'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'

export function MockListBar({
  chips,
  activeFilterCount = 0,
  selectMode = false,
  selectedCount = 0,
  onFilterClick,
  onSelectClick,
  onExportClick,
}: {
  chips: ReactNode
  activeFilterCount?: number
  selectMode?: boolean
  selectedCount?: number
  onFilterClick: () => void
  onSelectClick: () => void
  onExportClick?: () => void
}) {
  return (
    <div className="listbar">
      <div className="listbar-chips">{chips}</div>
      <div className="listbar-actions">
        <MockBtn
          icon="filter"
          kind={activeFilterCount ? 'primary' : 'ghost'}
          sm
          onClick={onFilterClick}
        >
          <span className="listbar-btn-label">
            Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </span>
        </MockBtn>
        <MockBtn icon="checks" kind={selectMode ? 'primary' : 'ghost'} sm onClick={onSelectClick}>
          <span className="listbar-btn-label">
            {selectMode ? `Auswahl (${selectedCount})` : 'Auswählen'}
          </span>
        </MockBtn>
        <MockBtn icon="download" kind="ghost" sm onClick={onExportClick}>
          <span className="listbar-btn-label">Export</span>
        </MockBtn>
      </div>
    </div>
  )
}

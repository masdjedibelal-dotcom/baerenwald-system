'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { cn } from '@/lib/utils'

export type ListBulkBarProps = {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  onExport?: () => void
  /** „Alle“ / „Keine“ in Card-Listen */
  onToggleAll?: () => void
  allSelected?: boolean
  /** Vorgänge-Liste: alle gefilterten Treffer */
  selectAllFilteredLabel?: string
  onSelectAllFiltered?: () => void
  /** Einzelbearbeitung bei genau einer Zeile */
  onEdit?: () => void
  /** z. B. Kunden-Zusammenführen bei genau 2 Zeilen */
  extraActions?: ReactNode
  deleteDisabled?: boolean
  deletePending?: boolean
  className?: string
}

/** Einheitliche Mehrfachauswahl-Leiste für alle CRM-Listen. */
export function ListBulkBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
  onToggleAll,
  allSelected,
  selectAllFilteredLabel,
  onSelectAllFiltered,
  onEdit,
  extraActions,
  deleteDisabled,
  deletePending,
  className,
}: ListBulkBarProps) {
  if (selectedCount <= 0) return null

  return (
    <div className={cn('bulkbar', className)}>
      <span className="bulkbar-count">
        <b>{selectedCount}</b> ausgewählt
      </span>
      {onToggleAll ? (
        <MockBtn kind="ghost" sm onClick={onToggleAll} title={allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}>
          {allSelected ? 'Keine' : 'Alle'}
        </MockBtn>
      ) : null}
      {selectAllFilteredLabel && onSelectAllFiltered ? (
        <MockBtn kind="ghost" sm onClick={onSelectAllFiltered}>
          {selectAllFilteredLabel}
        </MockBtn>
      ) : null}
      <div style={{ flex: 1 }} />
      {onEdit && selectedCount === 1 ? (
        <MockBtn kind="ghost" sm icon="pencil" onClick={onEdit} disabled={deletePending}>
          Bearbeiten
        </MockBtn>
      ) : null}
      {onExport ? (
        <MockBtn kind="ghost" sm icon="download" onClick={onExport} disabled={deletePending}>
          Export
        </MockBtn>
      ) : null}
      {extraActions}
      <MockBtn
        kind="danger"
        sm
        icon="trash"
        onClick={onDelete}
        disabled={deleteDisabled || deletePending}
      >
        Löschen
      </MockBtn>
      <MockBtn
        kind="ghost"
        sm
        className="qa-btn bulkbar-clear"
        icon="x"
        onClick={onClear}
        title="Auswahl aufheben"
      />
    </div>
  )
}

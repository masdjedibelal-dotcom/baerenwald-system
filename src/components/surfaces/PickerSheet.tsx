'use client'

import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { cn } from '@/lib/utils'

export type PickerSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  context?: EditorSheetContext
  children: ReactNode
  /** Einziger Neu-Einstieg (Header-+) */
  onNeu?: () => void
  /** Quelle filtern — kein zweites „Neu“ */
  sourceChips?: { id: string; label: string; active?: boolean; onClick: () => void }[]
  search?: ReactNode
  /** Suche mobil unten */
  searchPlacement?: 'top' | 'bottom'
  empty?: ReactNode
  className?: string
  /** Siehe EditorSheet — aus bei Picker vor Navigation */
  manageHistory?: boolean
}

/** Liste wählen + optional Neu (Header-+). */
export function PickerSheet({
  open,
  onClose,
  title,
  context = 'canvas',
  children,
  onNeu,
  sourceChips,
  search,
  searchPlacement = 'bottom',
  empty,
  className,
  manageHistory = true,
}: PickerSheetProps) {
  const headerEnd = onNeu ? (
    <button
      type="button"
      className="editor-sheet__confirm"
      onClick={onNeu}
      aria-label="Neu"
      title="Neu"
    >
      <Plus className="h-5 w-5" aria-hidden />
    </button>
  ) : undefined

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      headerEnd={headerEnd}
      className={className}
      bodyClassName="picker-sheet__body"
      manageHistory={manageHistory}
    >
      {sourceChips && sourceChips.length > 0 ? (
        <div className="picker-sheet__chips" role="group" aria-label="Quelle">
          {sourceChips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn('picker-sheet__chip', c.active && 'is-active')}
              onClick={c.onClick}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      {search && searchPlacement === 'top' ? (
        <div className="picker-sheet__search picker-sheet__search--top">{search}</div>
      ) : null}
      <div className="picker-sheet__list">{empty ?? children}</div>
      {search && searchPlacement === 'bottom' ? (
        <div className="picker-sheet__search picker-sheet__search--bottom">{search}</div>
      ) : null}
    </EditorSheet>
  )
}

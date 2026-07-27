'use client'

import { type ReactNode, useCallback } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'

export type FormSheetProps = {
  open: boolean
  onClose: () => void
  breadcrumb?: string
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg'
  /** Surface-Kontext — default detail (Slide-over Desktop) */
  context?: EditorSheetContext
  dirty?: boolean
  onConfirm?: () => void
}

/**
 * @deprecated Alias → EditorSheet (Naming-Lüge beendet: war zentriertes Modal).
 * Footer wird ignoriert wenn onConfirm gesetzt — Primary = Header ✓.
 */
export function FormSheet({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md',
  context = 'detail',
  dirty,
  onConfirm,
}: FormSheetProps) {
  const handleConfirm = useCallback(() => {
    onConfirm?.()
  }, [onConfirm])

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      dirty={dirty}
      onConfirm={onConfirm ? handleConfirm : undefined}
      size={width === 'lg' ? 'lg' : 'md'}
    >
      {children}
      {footer && !onConfirm ? <div className="mt-4 border-t border-[var(--app-separator)] pt-3">{footer}</div> : null}
    </EditorSheet>
  )
}

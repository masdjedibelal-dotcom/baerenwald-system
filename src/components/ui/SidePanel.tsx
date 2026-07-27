'use client'

import { type ReactNode } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
  context?: EditorSheetContext
  dirty?: boolean
  onConfirm?: () => void
}

/**
 * @deprecated Alias → EditorSheet (echtes Slide-over bei context=detail).
 */
export function SidePanel({
  open,
  onClose,
  title,
  children,
  width = 'md',
  context = 'detail',
  dirty,
  onConfirm,
  actions,
}: SidePanelProps) {
  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      dirty={dirty}
      onConfirm={onConfirm}
      headerEnd={actions}
      size={width === 'lg' ? 'lg' : 'md'}
    >
      {children}
    </EditorSheet>
  )
}

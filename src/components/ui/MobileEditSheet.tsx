'use client'

import { useState, type ReactNode } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/** Bottom Sheet mit ✓ — nutzt EditorSheet (Surface B). */
export function MobileEditSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  dirty,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  dirty?: boolean
  onConfirm?: () => void
}) {
  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context="detail"
      dirty={dirty}
      onConfirm={onConfirm ?? onClose}
      className={className}
    >
      {children}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </EditorSheet>
  )
}

type MobileEditableBlockProps = {
  sheetTitle: string
  overview: ReactNode
  children: ReactNode
  disabled?: boolean
  editLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  overviewClassName?: string
  hideEditButton?: boolean
}

/**
 * Mobile: Overview → EditorSheet.
 * Desktop: children inline (Grenze ≤6 Felder).
 */
export function MobileEditableBlock({
  sheetTitle,
  overview,
  children,
  disabled,
  editLabel = 'Bearbeiten',
  open: controlledOpen,
  onOpenChange,
  overviewClassName,
  hideEditButton,
}: MobileEditableBlockProps) {
  const isMobile = useIsMobile()
  const [internalOpen, setInternalOpen] = useState(false)
  const sheetOpen = controlledOpen ?? internalOpen
  const setSheetOpen = onOpenChange ?? setInternalOpen

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <>
      <div className={cn('mobile-editable-overview', overviewClassName)}>
        {overview}
        {!hideEditButton && !disabled ? (
          <button
            type="button"
            className="mt-2 text-[length:var(--fs-text)] font-medium text-bw-primary"
            onClick={() => setSheetOpen(true)}
          >
            {editLabel}
          </button>
        ) : null}
      </div>
      <EditorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        context="detail"
        onConfirm={() => setSheetOpen(false)}
      >
        {children}
      </EditorSheet>
    </>
  )
}

export function MobileOverviewField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 py-1 text-[length:var(--fs-text)]">
      <span className="text-bw-text-muted">{label}</span>
      <span className="text-right text-bw-text">{value}</span>
    </div>
  )
}

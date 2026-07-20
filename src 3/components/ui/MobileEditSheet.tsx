'use client'

import { useState, type ReactNode } from 'react'
import { Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

/** Bottom Sheet mit Standard-Footer „Fertig“. */
export function MobileEditSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <MobileListFilterSheet
      open={open}
      onClose={onClose}
      title={title}
      className={className}
      footer={
        footer ?? (
          <Button type="button" variant="primary" size="sm" className="w-full gap-1.5" onClick={onClose}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Fertig
          </Button>
        )
      }
    >
      {children}
    </MobileListFilterSheet>
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
 * Mobile: Read-only Übersicht + Bearbeiten-Button → Sheet.
 * Desktop: `children` (Formular) direkt inline.
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
      <div className={cn('mobile-editable-overview space-y-3', overviewClassName)}>
        {overview}
        {!disabled && !hideEditButton ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setSheetOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {editLabel}
          </Button>
        ) : null}
      </div>
      <MobileEditSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle}>
        {children}
      </MobileEditSheet>
    </>
  )
}

/** Kurze Label/Wert-Zeile für Mobile-Übersichten. */
export function MobileOverviewField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-bw-text">{value ?? '—'}</dd>
    </div>
  )
}

'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { cn } from '@/lib/utils'

export type FormSheetProps = {
  open: boolean
  onClose: () => void
  /** Breadcrumb-Segment vor dem Titel, z. B. „Anfragen“ */
  breadcrumb?: string
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Standard 640px / wide 820px — Mock `.sheet` / `.sheet.wide` */
  width?: 'md' | 'lg'
}

/**
 * Mock Create/Edit-Container: zentriertes Modal (`.sheet-overlay` + `.sheet`).
 * Kein rechtes Sidepanel — Erstellen/Bearbeiten immer modal.
 */
export function FormSheet({
  open,
  onClose,
  breadcrumb,
  title,
  children,
  footer,
  width = 'md',
}: FormSheetProps) {
  const [mounted, setMounted] = useState(false)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [open, handleKey])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="sheet-overlay form-sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-title"
        className={cn('sheet form-sheet', width === 'lg' && 'wide')}
      >
        <div className="sheet-h">
          <div className="title flex min-w-0 flex-1 items-center gap-2">
            {breadcrumb ? <span className="sub">{breadcrumb}</span> : null}
            <h2 id="form-sheet-title" className="min-w-0 truncate">
              {title}
            </h2>
          </div>
          <MockBtn sm kind="ghost" icon="x" onClick={onClose} title="Schließen" />
        </div>

        <div className="sheet-b">{children}</div>

        {footer ? <div className="sheet-f">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}

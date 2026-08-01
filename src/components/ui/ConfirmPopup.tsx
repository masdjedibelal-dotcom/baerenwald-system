'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

/**
 * Zentriertes Bestätigungs-Popup (Mobil + Desktop) —
 * für kurze Hinweise wie „Änderungen verwerfen?“, nicht für Formulare.
 */
export function ConfirmPopup({
  open,
  onClose,
  title,
  children,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  danger = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  danger?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open || !mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const release = dialog ? trapFocus(dialog, () => onCloseRef.current()) : undefined
    return () => {
      document.body.style.overflow = prev
      release?.()
    }
  }, [open, mounted])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="confirm-popup-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="confirm-popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="confirm-popup__body">
          <h2 id={titleId} className="confirm-popup__title">
            {title}
          </h2>
          {children ? <div className="confirm-popup__text">{children}</div> : null}
        </div>
        <div className={cn('confirm-popup__footer', danger && 'confirm-popup__footer--danger')}>
          {danger ? (
            <>
              <Button type="button" variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
              <Button type="button" variant="primary" onClick={onClose}>
                {cancelLabel}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button type="button" variant="primary" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

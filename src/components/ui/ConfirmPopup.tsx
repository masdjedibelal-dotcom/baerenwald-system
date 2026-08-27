'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

/**
 * Zentriertes Bestätigungs-Popup (Mobil + Desktop) —
 * für kurze Hinweise wie „Änderungen verwerfen?“, nicht für Formulare.
 *
 * Optional `onSaveDraft`: Drei Wege (Entwurf speichern / ohne Speichern / weiter).
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
  saveDraftLabel = 'Als Entwurf speichern',
  onSaveDraft,
  discardLabel,
}: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  danger?: boolean
  /** Wenn gesetzt: dritter Weg „Als Entwurf speichern“ (gestapelter Footer). */
  saveDraftLabel?: string
  onSaveDraft?: () => void
  /** Label für den Verwerfen-/Schließen-Button (Default = confirmLabel). */
  discardLabel?: string
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setMounted(true), [])
  useOverlayChromeLock(open && mounted)

  useEffect(() => {
    if (!open || !mounted) return
    const dialog = dialogRef.current
    if (!dialog) return
    return trapFocus(dialog, () => onCloseRef.current())
  }, [open, mounted])

  if (!open || !mounted) return null

  const leaveLabel = discardLabel ?? confirmLabel
  const unsavedClose = Boolean(onSaveDraft)

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
        <div
          className={cn(
            'confirm-popup__footer',
            unsavedClose && 'confirm-popup__footer--stack',
            danger && 'confirm-popup__footer--danger'
          )}
        >
          {unsavedClose ? (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onSaveDraft?.()
                }}
              >
                {saveDraftLabel}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
              >
                {leaveLabel}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </Button>
            </>
          ) : danger ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
              >
                {confirmLabel}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfirm()
                }}
              >
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

'use client'

import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Optionaler Untertitel unter dem Titel (Mock-Header) */
  subtitle?: ReactNode
  /** Optional neben dem Titel (z. B. Icon) — nach dem Schließen-Button links */
  leading?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Footer: Secondary/Abbrechen links · Primary rechts (space-between) */
  footerSpread?: boolean
}

const SIZE_WIDTH: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'min(24rem, 100%)',
  md: 'min(32rem, 100%)',
  lg: 'min(42rem, 100%)',
  xl: 'min(96vw, 56rem)',
}

/** Legacy-Name „Modal“ — Layout Spec §6: Desktop Slide-over, Mobil Bottom Sheet. Portal body. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  leading,
  children,
  footer,
  size = 'md',
  className,
  footerSpread = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    setMounted(true)
  }, [])

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
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={cn('modal', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ width: SIZE_WIDTH[size] }}
      >
        <div className="modal-h">
          <button
            type="button"
            className="editor-sheet__icon-btn"
            onClick={onClose}
            title="Schließen"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {leading ? <div className="icon">{leading}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id={titleId} className="title">
              {title}
            </div>
            {subtitle ? <div className="sub">{subtitle}</div> : null}
          </div>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? (
          <div className={cn('modal-f', footerSpread && 'modal-footer--spread')}>{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

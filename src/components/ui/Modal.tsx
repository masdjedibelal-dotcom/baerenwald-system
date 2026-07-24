'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Optionaler Untertitel unter dem Titel (Mock-Header) */
  subtitle?: ReactNode
  /** Optional links neben dem Titel (z. B. Icon-Kreis) */
  leading?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Footer: Abbrechen links, Primäraktion rechts */
  footerSpread?: boolean
}

const SIZE_WIDTH: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'min(24rem, 100%)',
  md: 'min(32rem, 100%)',
  lg: 'min(42rem, 100%)',
  xl: 'min(96vw, 56rem)',
}

/** Zentriertes Mock-Modal (nie Sidepanel). Portal auf document.body. Kanonisch für CRM. */
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
        tabIndex={-1}
        style={{ width: SIZE_WIDTH[size] }}
      >
        <div className="modal-h">
          {leading ? <div className="icon">{leading}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="title">{title}</div>
            {subtitle ? <div className="sub">{subtitle}</div> : null}
          </div>
          <MockBtn icon="x" kind="ghost" sm onClick={onClose} title="Schließen" />
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

'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
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

/** Zentriertes Mock-Modal (nie Sidepanel). Portal auf document.body. */
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

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-[min(96vw,56rem)]',
  }[size]

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={cn('modal bg-white', sizeClass, className)}
        role="dialog"
        aria-modal="true"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="modal-header">
          <div className="modal-header-main min-w-0 flex-1">
            {leading ? <div className="modal-header-leading">{leading}</div> : null}
            <div className="min-w-0">
              <h2 className="modal-title">{title}</h2>
              {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-bw-light transition-colors hover:text-bw-text"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? (
          <div className={cn('modal-footer', footerSpread && 'modal-footer--spread')}>{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

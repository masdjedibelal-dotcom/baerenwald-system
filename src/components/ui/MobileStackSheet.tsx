'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bottom Sheet mit Zurück-Navigation (Mobil, gestapelte Ansichten). */
export function MobileStackSheet({
  open,
  onClose,
  title,
  onBack,
  canGoBack = false,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  onBack?: () => void
  canGoBack?: boolean
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (canGoBack && onBack) onBack()
        else onClose()
      }
    }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose, onBack, canGoBack])

  if (!open) return null

  return (
    <div className={cn('mobile-filter-sheet md:hidden', className)} role="dialog" aria-modal="true">
      <button type="button" className="mobile-filter-sheet__backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="mobile-filter-sheet__panel">
        <header className="mobile-filter-sheet__header">
          {canGoBack && onBack ? (
            <button type="button" onClick={onBack} className="mobile-filter-sheet__close" aria-label="Zurück">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={onClose} className="mobile-filter-sheet__close" aria-label="Schließen">
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
          <h2 className="mobile-filter-sheet__title">{title}</h2>
        </header>
        <div className="mobile-filter-sheet__body">{children}</div>
        {footer ? <footer className="mobile-filter-sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}

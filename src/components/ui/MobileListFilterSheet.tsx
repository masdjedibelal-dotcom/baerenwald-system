'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileListFilterSheet({
  open,
  onClose,
  title = 'Filter',
  headerEnd,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  headerEnd?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={cn('mobile-filter-sheet md:hidden', className)} role="dialog" aria-modal="true">
      <button type="button" className="mobile-filter-sheet__backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="mobile-filter-sheet__panel">
        <header className="mobile-filter-sheet__header">
          <button type="button" onClick={onClose} className="mobile-filter-sheet__close" aria-label="Schließen">
            <X className="h-5 w-5" aria-hidden />
          </button>
          <h2 className="mobile-filter-sheet__title">{title}</h2>
          {headerEnd ? <div className="mobile-filter-sheet__header-end">{headerEnd}</div> : null}
        </header>
        <div className="mobile-filter-sheet__body">{children}</div>
        {footer ? <footer className="mobile-filter-sheet__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}

export function MobileFilterSection({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mobile-filter-section', className)}>
      <h3 className="mobile-filter-section__label">{label}</h3>
      {children}
    </section>
  )
}

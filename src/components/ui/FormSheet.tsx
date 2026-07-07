'use client'

import { type ReactNode, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FormSheetProps = {
  open: boolean
  onClose: () => void
  /** Breadcrumb-Segment vor dem Titel, z. B. „Anfragen“ */
  breadcrumb?: string
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Standard 640px wie Mock `.sheet` */
  width?: 'md' | 'lg'
}

export function FormSheet({
  open,
  onClose,
  breadcrumb,
  title,
  children,
  footer,
  width = 'md',
}: FormSheetProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  const widthClass = width === 'lg' ? 'md:w-[min(820px,96vw)]' : 'md:w-[min(640px,92vw)]'

  if (!open) return null

  return (
    <div
      className="form-sheet-overlay fixed inset-0 z-sidepanel flex justify-end bg-[rgba(20,24,31,0.32)] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-sheet-title"
        className={cn(
          'form-sheet flex max-h-[92vh] w-full flex-col bg-bw-card shadow-[-8px_0_30px_-10px_rgba(20,24,31,0.18)]',
          'animate-slide-up rounded-t-2xl md:max-h-none md:h-full md:animate-slide-right md:rounded-none',
          widthClass
        )}
      >
        <div className="flex justify-center pb-1 pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-bw-border" />
        </div>

        <header className="flex min-h-[44px] shrink-0 items-center gap-2.5 border-b border-bw-border px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold leading-tight tracking-tight">
            {breadcrumb ? (
              <>
                <span className="shrink-0 font-medium text-bw-text-muted">{breadcrumb}</span>
                <span className="text-bw-text-subtle" aria-hidden>
                  ›
                </span>
              </>
            ) : null}
            <h2 id="form-sheet-title" className="min-w-0 truncate text-bw-text">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 text-[13px] leading-snug">
          {children}
        </div>

        {footer ? (
          <footer className="flex min-h-[44px] shrink-0 items-center gap-2 border-t border-bw-border bg-bw-card px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

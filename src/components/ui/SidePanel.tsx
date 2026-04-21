'use client'

import { type ReactNode, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  children,
  width = 'md',
}: SidePanelProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  const widthClass = {
    sm: 'w-full md:w-96',
    md: 'w-full md:w-[480px]',
    lg: 'w-full md:w-[600px]',
  }[width]

  if (!open) return null

  return (
    <>
      <div
        className="z-sidepanel fixed inset-0 bg-black/50 md:bg-black/20"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />

      <div
        className={`z-sidepanel-pop fixed flex max-h-[90vh] flex-col rounded-t-2xl bg-bw-card shadow-lg animate-slide-up md:inset-y-0 md:right-0 md:max-h-none md:rounded-none md:rounded-l-xl md:animate-slide-right ${widthClass} bottom-0 left-0 right-0 md:bottom-0 md:left-auto md:top-0`}
      >
        <div className="flex justify-center pb-1 pt-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-bw-border" />
        </div>

        <div className="flex flex-shrink-0 items-start justify-between border-b border-bw-border px-5 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-md truncate font-semibold text-bw-text">{title}</h2>
              {badge}
            </div>
            {subtitle ? <p className="mt-0.5 text-sm text-bw-text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1.5 text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-bw-border bg-bw-bg px-5 py-3">{actions}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </>
  )
}

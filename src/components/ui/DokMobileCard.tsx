'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mobile Dokument-Karte analog Leistungen (`lt-card`):
 * Titel + Badge oben, Meta + Chevron unten.
 */
export function DokMobileCard({
  title,
  badge,
  meta,
  onClick,
  className,
  children,
}: {
  title: string
  badge?: ReactNode
  meta?: string | null
  onClick?: () => void
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn('dok-card', className)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div className="dok-card__head">
        <span className="dok-card__title">{title}</span>
        {badge ? <div className="dok-card__badge">{badge}</div> : null}
      </div>
      {children}
      <div className="dok-card__meta">
        <span className="dok-card__meta-left">{meta || '—'}</span>
        <span className="dok-card__meta-right">
          <ChevronRight className="dok-card__chev h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  )
}

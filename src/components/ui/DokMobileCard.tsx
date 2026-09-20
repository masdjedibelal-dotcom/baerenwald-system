'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ReactNode } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { cn } from '@/lib/utils'

/**
 * Mobile Dokument-Karte analog Leistungen:
 * Titel + Badge oben, Meta + Chevron unten — gerendert als MockCard.
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
    <MockCard
      className={cn('dok-mobile', className)}
      flush
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
      <div className="dok-mobile__head">
        <span className="dok-mobile__title">{title}</span>
        {badge ? <div className="dok-mobile__badge">{badge}</div> : null}
      </div>
      {children}
      <div className="dok-mobile__meta">
        <span className="dok-mobile__meta-left">{meta || '—'}</span>
        <span className="dok-mobile__meta-right">
          <MockIcon n="chevron-right" ctx="default" className="dok-mobile__chev h-4 w-4" aria-hidden />
        </span>
      </div>
    </MockCard>
  )
}

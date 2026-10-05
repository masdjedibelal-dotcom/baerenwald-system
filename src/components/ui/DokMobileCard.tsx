'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Dokument als Listenzeile (mobil wie eine Tabelle, keine Karte in der Karte):
 * Name + Meta links, Kennzeichnung und Pfeil rechts.
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
      className={cn('dok-zeile', onClick && 'is-klickbar', className)}
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
      <div className="dok-zeile__main">
        <span className="dok-zeile__titel">{title}</span>
        {meta ? <span className="dok-zeile__meta">{meta}</span> : null}
        {children}
      </div>
      {badge ? <div className="dok-zeile__badge">{badge}</div> : null}
      {onClick ? (
        <MockIcon n="chevron-right" ctx="default" className="dok-zeile__chev h-4 w-4" aria-hidden />
      ) : null}
    </div>
  )
}

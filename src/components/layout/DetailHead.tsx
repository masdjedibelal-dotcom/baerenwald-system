'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DetailHeadProps = {
  /** @deprecated Zurück nur über TopBar (mobil) / Master-Detail — wird nicht mehr gerendert */
  backHref?: string
  backLabel?: string
  title: ReactNode
  sub?: ReactNode
  /** Chips unter Titel (PLZ, Betrag, Kanal …) */
  meta?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  /** Stärkerer Projekt-Kopf mit Trennlinie */
  variant?: 'default' | 'project'
  className?: string
}

/** Kompakter Detail-Kopf: Titel, Badge, Aktionen — ohne Rahmen, ohne Avatar. */
export function DetailHead({
  title,
  sub,
  meta,
  badges,
  actions,
  variant = 'project',
  className,
}: DetailHeadProps) {
  return (
    <header className={cn('detail-head', variant === 'project' && 'detail-head--project', className)}>
      <div className="detail-head-top">
        <div className="detail-head-main min-w-0 flex-1">
          <div className="detail-head-title">{title}</div>
          {badges ? (
            <div className="detail-head-badges mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>
          ) : null}
          {sub ? <div className="detail-head-sub">{sub}</div> : null}
          {meta ? <div className="detail-head-meta">{meta}</div> : null}
        </div>

        {actions ? <div className="detail-head-actions min-w-0">{actions}</div> : null}
      </div>
    </header>
  )
}

/** Avatar für andere Bereiche (z. B. Kalender) — nicht im Detail-Kopf. */
export function DetailVisual({
  initials,
  tone = 'green',
  icon,
  size = 'md',
}: {
  initials?: string
  tone?: 'green' | 'gold' | 'gray'
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const toneClass = {
    green: 'bg-bw-green-bg text-bw-primary',
    gold: 'bg-bw-accent-bg text-bw-accent',
    gray: 'bg-bw-hover text-bw-text-mid',
  }[tone]

  const sizeClass = {
    sm: 'h-[26px] w-[26px] text-[10px]',
    md: 'h-11 w-11 text-sm',
    lg: 'h-11 w-11 text-sm md:h-[44px] md:w-[44px] md:text-sm',
  }[size]

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold tracking-wide',
        sizeClass,
        toneClass
      )}
    >
      {icon ?? initials?.slice(0, 2).toUpperCase() ?? '??'}
    </div>
  )
}

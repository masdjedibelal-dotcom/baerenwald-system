'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DetailHeadProps = {
  /** @deprecated Zurück nur über TopBar (mobil) / Master-Detail — wird nicht mehr gerendert */
  backHref?: string
  backLabel?: string
  title: ReactNode
  sub?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Kompakter Detail-Kopf: Titel, Badge, Aktionen — ohne Rahmen, ohne Avatar. */
export function DetailHead({
  title,
  sub,
  badges,
  actions,
  className,
}: DetailHeadProps) {
  return (
    <div className={cn('detail-head', className)}>
      <div className="detail-head-main min-w-0 flex-1">
        <div className="detail-head-title">{title}</div>
        {sub ? <div className="detail-head-sub">{sub}</div> : null}
      </div>

      {badges ? <div className="detail-head-badges flex shrink-0 flex-wrap items-center gap-1.5">{badges}</div> : null}

      {actions ? <div className="detail-head-actions min-w-0">{actions}</div> : null}
    </div>
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

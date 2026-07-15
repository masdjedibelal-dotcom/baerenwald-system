'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DetailHeadProps = {
  /** @deprecated Zurück nur über DetailCrumb / TopBar */
  backHref?: string
  backLabel?: string
  breadcrumb?: ReactNode
  title: ReactNode
  sub?: ReactNode
  meta?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  variant?: 'default' | 'project'
  className?: string
}

/** Mock detail-head: .dh-title, .dh-meta, .dh-titlerow */
export function DetailHead({
  title,
  sub,
  meta,
  badges,
  actions,
  className,
}: DetailHeadProps) {
  const metaContent = meta ?? badges

  return (
    <header className={cn('detail-head', className)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="dh-title">{title}</div>
        {sub ? <div className="sub">{sub}</div> : null}
        {metaContent ? <div className="dh-meta">{metaContent}</div> : null}
      </div>
      {actions ? <div className="detail-head-actions shrink-0">{actions}</div> : null}
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

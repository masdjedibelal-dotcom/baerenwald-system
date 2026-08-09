'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DetailHeadProps = {
  /** @deprecated Zurück nur über TopBar (mobil) / Master-Detail — wird nicht mehr gerendert */
  backHref?: string
  backLabel?: string
  title: ReactNode
  sub?: ReactNode
  /** Meta-Zeile (.dh-meta) — Badges gehören hierhin (inline), nicht darunter */
  meta?: ReactNode
  badges?: ReactNode
  /** Badges direkt neben dem Titel (Mock: Freigabe) */
  titleBadges?: ReactNode
  /** Icon-Aktionen rechts im Titel (z. B. Portal-Login) — immer sichtbar, nicht im ⋯ */
  titleTrailing?: ReactNode
  actions?: ReactNode
  /** Stärkerer Projekt-Kopf mit Trennlinie */
  variant?: 'default' | 'project'
  className?: string
}

/** Kompakter Detail-Kopf: Titel + Badges/Meta (Mock `.vgid` / `.detail-head`). */
export function DetailHead({
  title,
  sub,
  meta,
  badges,
  titleBadges,
  titleTrailing,
  actions,
  variant = 'project',
  className,
}: DetailHeadProps) {
  const hasMetaRow = Boolean(badges || meta)

  return (
    <header className={cn('detail-head', variant === 'project' && 'detail-head--project', className)}>
      <div className="detail-head-main vgid min-w-0 flex-1">
        <div className="dh-titlerow">
          <div className="dh-title vgid-name">{title}</div>
          {titleBadges ? <div className="dh-title-badges">{titleBadges}</div> : null}
          {titleTrailing ? (
            <div className="dh-title-trailing ml-auto flex shrink-0 items-center gap-1">
              {titleTrailing}
            </div>
          ) : null}
        </div>
        {hasMetaRow ? (
          <div className="dh-meta vgid-meta">
            {badges}
            {badges && meta ? <span className="sep" aria-hidden>
              ·
            </span> : null}
            {meta}
          </div>
        ) : null}
        {sub ? <div className="detail-head-sub">{sub}</div> : null}
      </div>

      {actions ? <div className="detail-head-actions min-w-0">{actions}</div> : null}
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
    sm: 'h-[26px] w-[26px] text-[length:var(--fs-meta)]',
    md: 'h-11 w-11 text-[length:var(--fs-text)]',
    lg: 'h-11 w-11 text-[length:var(--fs-text)] md:h-[44px] md:w-[44px] md:text-[length:var(--fs-text)]',
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

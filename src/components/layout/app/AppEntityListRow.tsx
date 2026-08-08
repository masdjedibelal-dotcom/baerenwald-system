'use client'

import type { ReactNode } from 'react'
import { AppEntityCard, AppEntityCardLink } from '@/components/layout/app/AppEntityCard'
import { cn } from '@/lib/utils'

export type AppEntityListRowProps = {
  /** Klick-Navigation (Link) */
  href?: string
  /** Klick-Navigation (Button) */
  onClick?: () => void
  avatar: ReactNode
  /** Kleine Zeile über dem Titel (z. B. Auftrags-/Rechnungsnr.) */
  eyebrow?: ReactNode
  title: ReactNode
  line2?: ReactNode
  line3?: ReactNode
  /** Betrag, hervorgehoben (4. Zeile) */
  line4?: ReactNode
  badge?: ReactNode
  /** Volle Breite unter der Hauptzeile (z. B. Fortschrittsbalken) */
  footer?: ReactNode
  className?: string
}

function RowContent({
  avatar,
  eyebrow,
  title,
  line2,
  line3,
  line4,
  badge,
  footer,
}: Omit<AppEntityListRowProps, 'href' | 'onClick' | 'className'>) {
  return (
    <>
      <div className="app-entity-list-row__main">
        <div className="app-entity-list-row__avatar shrink-0">{avatar}</div>
        <div className="app-entity-list-row__body min-w-0">
          {eyebrow ? <p className="app-entity-list-row__eyebrow">{eyebrow}</p> : null}
          <p className="app-entity-list-row__title">{title}</p>
          {line2 ? <p className="app-entity-list-row__line">{line2}</p> : null}
          {line3 ? <p className="app-entity-list-row__line">{line3}</p> : null}
          {line4 ? <p className="app-entity-list-row__line app-entity-list-row__line--strong">{line4}</p> : null}
        </div>
        {badge ? <div className="app-entity-list-row__badge shrink-0 self-start">{badge}</div> : null}
      </div>
      {footer ? <div className="app-entity-list-row__footer">{footer}</div> : null}
    </>
  )
}

/**
 * Einheitliche Mobil-Zeile für alle CRM-Listen (Anfragen-Referenz).
 * Avatar · 3–4 Textzeilen · Badge; optional Footer (Fortschritt).
 */
export function AppEntityListRow({
  href,
  onClick,
  className,
  ...content
}: AppEntityListRowProps) {
  const rowClass = cn('app-entity-list-row', className)

  if (href) {
    return (
      <AppEntityCardLink href={href} className={rowClass}>
        <RowContent {...content} />
      </AppEntityCardLink>
    )
  }

  return (
    <AppEntityCard type="button" onClick={onClick} className={rowClass}>
      <RowContent {...content} />
    </AppEntityCard>
  )
}

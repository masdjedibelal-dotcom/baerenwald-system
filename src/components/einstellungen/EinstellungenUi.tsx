import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TITLE_CLASS = 'm-0 text-[length:var(--fs-text)] font-semibold text-[var(--text)]'

/**
 * Einheitliche Bereichsüberschrift in Einstellungen
 * (wie „Teammitglieder“: fs-text, semibold).
 */
export function EinstellungenSectionHeading({
  children,
  className,
  actions,
}: {
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  if (actions != null) {
    return (
      <div className={cn('mb-3.5 flex items-center justify-between gap-3', className)}>
        <h2 className={TITLE_CLASS}>{children}</h2>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    )
  }
  return <h2 className={cn(TITLE_CLASS, className)}>{children}</h2>
}

/** Sekundärzeile unter Überschriften / in Listen. */
export function EinstellungenMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-bw-text-muted', className)}>{children}</p>
}

/** Untertitel in Listenzeilen (Typ, Anzahl, …). */
export function EinstellungenListMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('einst-list-meta', className)}>{children}</p>
}

/**
 * Innere Listen in Cards (Vorlagen, E-Mail, …).
 * Desktop: kompakte Divider-Liste · Mobil: gestapelte Cards wie CRM-Listen.
 */
export function EinstellungenListBody({
  children,
  empty,
}: {
  children?: ReactNode
  empty?: ReactNode
}) {
  if (empty) {
    return <p className="text-sm text-bw-text-muted">{empty}</p>
  }
  return <ul className="einst-list">{children}</ul>
}

export function EinstellungenListItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <li className={cn('einst-list-item', className)}>{children}</li>
}

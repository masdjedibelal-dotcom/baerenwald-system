import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Abschnittsüberschrift wie auf Preislisten & Detail-Screens. */
export function EinstellungenSectionHeading({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h2 className={cn('text-[13.5px] font-semibold text-bw-text', className)}>{children}</h2>
}

/** Sekundärzeile unter Überschriften / in Listen. */
export function EinstellungenMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-bw-text-muted', className)}>{children}</p>
}

/** Untertitel in Listenzeilen (Typ, Anzahl, …). */
export function EinstellungenListMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs text-bw-text-muted', className)}>{children}</p>
}

/** Innere Listen in Cards (wie Kommunikation-Vorlagen). */
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
  return <ul className="divide-y divide-bw-border">{children}</ul>
}

export function EinstellungenListItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <li className={cn('flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0', className)}>
      {children}
    </li>
  )
}

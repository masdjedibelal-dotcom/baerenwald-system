'use client'

import type { ReactNode } from 'react'
import { MockTable } from '@/components/mock-ui'
import { cn } from '@/lib/utils'

type ListFilterSectionProps = {
  /** Status-/Typ-Chips — Desktop sichtbar, Mobil im Filter-Sheet */
  chips?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Einheitliches Listen-Filter-Layout:
 * Desktop — Zeile 1: Suche | Filter; Zeile 2: Chips
 * Mobil — eine Zeile: kompakte Suche links, Filter-Button rechts (Sheet); Chips nur im Sheet
 */
export function ListFilterSection({ chips, children, className }: ListFilterSectionProps) {
  return (
    <div className={cn('list-filter-section', className)}>
      <div className="toolbar">{children}</div>
      {chips ? <div className="chiprow">{chips}</div> : null}
    </div>
  )
}

/** Scroll-/min-width-Hülle um ListCards (kein table). */
export function ListCardScroll({
  children,
  minWidth = '720px',
  className,
}: {
  children: ReactNode
  minWidth?: string
  className?: string
}) {
  return (
    <div className={cn('listcard min-w-0 overflow-x-auto', className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}

/** Desktop-Tabellen-Container (einheitlich: rounded-lg). */
export function ListTableShell({
  children,
  minWidth = '720px',
  className,
}: {
  children: ReactNode
  minWidth?: string
  className?: string
}) {
  return (
    <MockTable
      wrapClassName={cn('list-table-shell', className)}
      className="w-full border-collapse text-left text-[length:var(--fs-text)]"
      style={{ minWidth }}
    >
      {children}
    </MockTable>
  )
}

/** Mobile: gestapelte ListCards in einer Card-Hülle. */
export function ListMobileCards({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('list-mobile-cards', className)}>{children}</div>
}

/** Gestapelte ListCards auf allen Bildschirmgrößen. */
export function ListCardStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('list-card-stack', className)}>{children}</div>
}

/** Gestapelte Karten (Mobil; in Master-Detail-Pane auch Desktop). */
export function ListMobileStack({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('list-mobile-stack', className)}>{children}</ul>
}

/** Zeile für MobileSortSelect o. Ä. — nur Desktop sichtbar (Sortierung mobil im Filter-Sheet). */
export function ListSortRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('list-sort-row hidden md:block', className)}>{children}</div>
}

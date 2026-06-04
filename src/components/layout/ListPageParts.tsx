import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ListFilterSectionProps = {
  /** Status-/Typ-Chips in eigener Zeile unter Suche & Filtern */
  chips?: ReactNode
  /** ListFilterBar (Suche links, Filter rechts) */
  children: ReactNode
  className?: string
}

/**
 * Einheitliches Listen-Filter-Layout (Mobil + Desktop):
 * Zeile 1: Suche | Divider | Filter
 * Zeile 2: Filter-Chips
 */
export function ListFilterSection({ chips, children, className }: ListFilterSectionProps) {
  return (
    <div
      data-list-filter-sticky
      className={cn('list-filter-section list-filter-sticky mb-4 flex flex-col gap-2.5', className)}
    >
      {children}
      {chips ? <div className="list-filter-chips-row min-w-0">{chips}</div> : null}
    </div>
  )
}

/** Wireframe-Listenhülle: `.listcard` mit optionalem horizontalem Scroll. */
export function ListGridShell({
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

/** Desktop-Tabellen-Container (einheitlich: rounded-lg, shadow-card). */
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
    <div className={cn('list-table-shell', className)}>
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
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

/** Zeile für MobileSortSelect o. Ä. */
export function ListSortRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('list-sort-row', className)}>{children}</div>
}

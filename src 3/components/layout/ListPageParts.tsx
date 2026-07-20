'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FilterChips, type FilterOption } from '@/components/ui/FilterChips'

export type ListFilterChipGroup = {
  label?: string
  options: FilterOption[]
  selected: string[]
  onChange: (values: string[]) => void
  multiple?: boolean
}

const ListFilterChipGroupsContext = createContext<ListFilterChipGroup[]>([])

export function useListFilterChipGroups(): ListFilterChipGroup[] {
  return useContext(ListFilterChipGroupsContext)
}

type ListFilterSectionProps = {
  /** Status-/Typ-Chips — Desktop sichtbar, Mobil im Filter-Sheet */
  chipGroups?: ListFilterChipGroup[]
  /** Legacy: freie Chip-Zeile (nur Desktop) */
  chips?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Einheitliches Listen-Filter-Layout:
 * Desktop — Zeile 1: Suche | Filter; Zeile 2: Chips
 * Mobil — eine Zeile: kompakte Suche links, Filter-Button rechts (Sheet); Chips nur im Sheet
 */
export function ListFilterSection({ chipGroups, chips, children, className }: ListFilterSectionProps) {
  const desktopChips =
    chipGroups && chipGroups.length > 0 ? (
      <div className="flex min-w-0 flex-col gap-1.5">
        {chipGroups.map((group, index) => (
          <div key={group.label ?? `chip-group-${index}`} className="min-w-0">
            {group.label ? (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                {group.label}
              </p>
            ) : null}
            <FilterChips
              options={group.options}
              selected={group.selected}
              onChange={group.onChange}
              multiple={group.multiple}
            />
          </div>
        ))}
      </div>
    ) : (
      chips
    )

  return (
    <ListFilterChipGroupsContext.Provider value={chipGroups ?? []}>
      <div
        data-list-filter-sticky
        className={cn('list-filter-section list-filter-sticky mb-[14px] flex flex-col gap-[10px]', className)}
      >
        <div className="toolbar">{children}</div>
        {desktopChips ? (
          <div className="list-filter-chips-row chiprow hidden min-w-0 md:block">{desktopChips}</div>
        ) : null}
      </div>
    </ListFilterChipGroupsContext.Provider>
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

/** Zeile für MobileSortSelect o. Ä. — nur Desktop sichtbar (Sortierung mobil im Filter-Sheet). */
export function ListSortRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('list-sort-row hidden md:block', className)}>{children}</div>
}

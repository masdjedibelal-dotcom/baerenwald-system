'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { ExportCsvButton } from '@/components/ui/ExportCsvButton'
import { FilterChips } from '@/components/ui/FilterChips'
import { useListFilterChipGroups } from '@/components/layout/ListPageParts'
import {
  MobileFilterSection,
  MobileListFilterSheet,
} from '@/components/ui/MobileListFilterSheet'
import { SearchInput } from '@/components/ui/SearchInput'
import type { SortDir } from '@/hooks/useSort'
import {
  LIST_FILTER_ICON_BTN_CLASS,
  LIST_FILTER_RESET_BTN_CLASS,
  LIST_FILTER_SELECT_CLASS,
} from '@/lib/list-filter-ui'
import { cn } from '@/lib/utils'
import type { ZeitraumPreset } from '@/lib/listZeitraum'
import { ZEITRAUM_OPTIONS } from '@/lib/listZeitraum'

export type FilterTag = {
  id: string
  label: string
  onRemove: () => void
}

type SelectOption = { value: string; label: string }

export type ListFilterSortConfig = {
  options: { field: string; label: string }[]
  currentField: string | null
  currentDir: SortDir | null
  onSort: (field: string) => void
}

function countMobileActiveFilters(input: {
  chipGroups: ReturnType<typeof useListFilterChipGroups>
  statusValue: string
  hideStatusFilter: boolean
  secondaryValue?: string
  zeitraumValue: ZeitraumPreset
}): number {
  let n = 0
  for (const group of input.chipGroups) {
    const value = group.selected[0] ?? ''
    if (value && value !== 'alle' && value !== '') n++
  }
  if (!input.hideStatusFilter && input.statusValue) n++
  if (input.secondaryValue) n++
  if (input.zeitraumValue !== 'alle') n++
  return n
}

export function ListFilterBar({
  statusLabel = 'Status',
  statusOptions,
  statusValue,
  onStatusChange,
  hideStatusFilter = false,
  hideZeitraumFilter = false,
  secondaryFilter,
  zeitraumValue,
  onZeitraumChange,
  showCustomDates,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Suchen…',
  onReset,
  hasActiveFilters,
  tags,
  onExportClick,
  toolbarEnd,
  sort,
  resultCount,
  className,
}: {
  statusLabel?: string
  statusOptions: SelectOption[]
  statusValue: string
  onStatusChange: (v: string) => void
  hideStatusFilter?: boolean
  hideZeitraumFilter?: boolean
  secondaryFilter?: {
    label: string
    options: SelectOption[]
    value: string
    onChange: (v: string) => void
  }
  zeitraumValue: ZeitraumPreset
  onZeitraumChange: (v: ZeitraumPreset) => void
  showCustomDates: boolean
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  onReset: () => void
  hasActiveFilters: boolean
  tags?: FilterTag[]
  onExportClick?: () => void
  toolbarEnd?: ReactNode
  sort?: ListFilterSortConfig
  resultCount?: number
  className?: string
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const chipGroups = useListFilterChipGroups()

  const mobileFilterCount = useMemo(
    () =>
      countMobileActiveFilters({
        chipGroups,
        statusValue,
        hideStatusFilter,
        secondaryValue: secondaryFilter?.value,
        zeitraumValue,
      }),
    [chipGroups, statusValue, hideStatusFilter, secondaryFilter?.value, zeitraumValue]
  )

  const controls = (
    <>
      {!hideStatusFilter && statusOptions.length > 1 ? (
        <select
          aria-label={statusLabel}
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          className={LIST_FILTER_SELECT_CLASS}
        >
          {statusOptions.map((o) => (
            <option key={`${o.value}-${o.label}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      {secondaryFilter ? (
        <select
          aria-label={secondaryFilter.label}
          value={secondaryFilter.value}
          onChange={(e) => secondaryFilter.onChange(e.target.value)}
          className={LIST_FILTER_SELECT_CLASS}
        >
          {secondaryFilter.options.map((o) => (
            <option key={`${o.value}-${o.label}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      {!hideZeitraumFilter ? (
        <select
          aria-label="Zeitraum"
          value={zeitraumValue}
          onChange={(e) => onZeitraumChange(e.target.value as ZeitraumPreset)}
          className={LIST_FILTER_SELECT_CLASS}
        >
          {ZEITRAUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      {toolbarEnd}
      {onExportClick ? (
        <ExportCsvButton
          variant="ghost"
          onClick={onExportClick}
          iconOnly
          className={LIST_FILTER_ICON_BTN_CLASS}
        />
      ) : null}
      <button
        type="button"
        onClick={onReset}
        disabled={!hasActiveFilters}
        className={LIST_FILTER_RESET_BTN_CLASS}
        title="Filter zurücksetzen"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Filter</span>
      </button>
    </>
  )

  const sheetBody = (
    <>
      {chipGroups.map((group, index) => (
        <MobileFilterSection key={group.label ?? `group-${index}`} label={group.label ?? 'Status'}>
          <FilterChips
            variant="grid"
            options={group.options}
            selected={group.selected}
            onChange={group.onChange}
            multiple={group.multiple}
          />
        </MobileFilterSection>
      ))}

      {!hideStatusFilter && statusOptions.length > 1 ? (
        <MobileFilterSection label={statusLabel}>
          <select
            aria-label={statusLabel}
            value={statusValue}
            onChange={(e) => onStatusChange(e.target.value)}
            className={cn(LIST_FILTER_SELECT_CLASS, 'w-full')}
          >
            {statusOptions.map((o) => (
              <option key={`${o.value}-${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </MobileFilterSection>
      ) : null}

      {secondaryFilter ? (
        <MobileFilterSection label={secondaryFilter.label}>
          <select
            aria-label={secondaryFilter.label}
            value={secondaryFilter.value}
            onChange={(e) => secondaryFilter.onChange(e.target.value)}
            className={cn(LIST_FILTER_SELECT_CLASS, 'w-full')}
          >
            {secondaryFilter.options.map((o) => (
              <option key={`${o.value}-${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </MobileFilterSection>
      ) : null}

      {!hideZeitraumFilter ? (
        <MobileFilterSection label="Zeitraum">
          <select
            aria-label="Zeitraum"
            value={zeitraumValue}
            onChange={(e) => onZeitraumChange(e.target.value as ZeitraumPreset)}
            className={cn(LIST_FILTER_SELECT_CLASS, 'w-full')}
          >
            {ZEITRAUM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {showCustomDates ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Von"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className={LIST_FILTER_SELECT_CLASS}
              />
              <span className="text-[12px] text-bw-text-muted">bis</span>
              <input
                type="date"
                aria-label="Bis"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className={LIST_FILTER_SELECT_CLASS}
              />
            </div>
          ) : null}
        </MobileFilterSection>
      ) : null}

      {sort ? (
        <MobileFilterSection label="Sortieren">
          <select
            aria-label="Sortieren"
            value={sort.currentField ?? ''}
            onChange={(e) => sort.onSort(e.target.value)}
            className={cn(LIST_FILTER_SELECT_CLASS, 'w-full')}
          >
            <option value="">Standard</option>
            {sort.options.map((o) => (
              <option key={o.field} value={o.field}>
                {o.label}
                {sort.currentField === o.field
                  ? sort.currentDir === 'asc'
                    ? ' ↑'
                    : ' ↓'
                  : ''}
              </option>
            ))}
          </select>
        </MobileFilterSection>
      ) : null}

      {onExportClick ? (
        <MobileFilterSection label="Export">
          <ExportCsvButton variant="secondary" onClick={onExportClick} className="w-full justify-center" />
        </MobileFilterSection>
      ) : null}
    </>
  )

  const resultLabel =
    resultCount === undefined
      ? 'Anwenden'
      : resultCount === 1
        ? '1 Ergebnis anzeigen'
        : `${resultCount} Ergebnisse anzeigen`

  return (
    <>
      <div className={cn('list-filter-bar space-y-2.5 max-md:space-y-2', className)}>
        <div className="list-filter-toolbar-row toolbar">
          <div className="list-filter-toolbar-search min-w-0 flex-1">
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              flex
            />
          </div>
          <div className="list-filter-toolbar-divider hidden md:block" aria-hidden />
          <div className="list-filter-toolbar-controls">{controls}</div>
          <div className="list-filter-toolbar-mobile shrink-0 md:hidden">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mobile-filter-trigger-btn"
              aria-label="Filter öffnen"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Filter</span>
              {mobileFilterCount > 0 ? (
                <span className="mobile-filter-trigger-btn__badge">{mobileFilterCount}</span>
              ) : null}
            </button>
          </div>
        </div>

        {showCustomDates ? (
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <input
              type="date"
              aria-label="Von"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className={LIST_FILTER_SELECT_CLASS}
            />
            <span className="text-[12px] text-bw-text-muted">bis</span>
            <input
              type="date"
              aria-label="Bis"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className={LIST_FILTER_SELECT_CLASS}
            />
          </div>
        ) : null}

        {tags && tags.length > 0 ? (
          <div className="list-filter-active-tags hidden gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
            {tags.map((t) => (
              <button key={t.id} type="button" onClick={t.onRemove} className="chip shrink-0">
                {t.label}
                <X className="h-3 w-3 opacity-70" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <MobileListFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        headerEnd={
          <button
            type="button"
            onClick={() => {
              onReset()
            }}
            disabled={!hasActiveFilters}
            className="mobile-filter-sheet__reset"
          >
            Zurücksetzen
          </button>
        }
        footer={
          <button type="button" className="btn btn-primary w-full" onClick={() => setSheetOpen(false)}>
            {resultLabel}
          </button>
        }
      >
        {sheetBody}
      </MobileListFilterSheet>
    </>
  )
}

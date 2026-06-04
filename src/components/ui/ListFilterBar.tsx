'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { ExportCsvButton } from '@/components/ui/ExportCsvButton'
import { SearchInput } from '@/components/ui/SearchInput'
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

export function ListFilterBar({
  statusLabel = 'Status',
  statusOptions,
  statusValue,
  onStatusChange,
  hideStatusFilter = false,
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
  hideToolbarOnMobile = false,
  mobileRail,
  className,
}: {
  statusLabel?: string
  statusOptions: SelectOption[]
  statusValue: string
  onStatusChange: (v: string) => void
  hideStatusFilter?: boolean
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
  hideToolbarOnMobile?: boolean
  mobileRail?: ReactNode
  className?: string
}) {
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

  return (
    <div className={cn('list-filter-bar space-y-2.5', className)}>
      <div className="list-filter-toolbar-row">
        <div className="list-filter-toolbar-search min-w-0 flex-1">
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            flex
          />
        </div>
        <div className="list-filter-toolbar-divider" aria-hidden />
        <div
          className={cn(
            'list-filter-toolbar-controls',
            hideToolbarOnMobile && 'hidden md:flex'
          )}
        >
          {controls}
        </div>
        {mobileRail ? <div className="list-filter-toolbar-mobile md:hidden">{mobileRail}</div> : null}
      </div>

      {showCustomDates ? (
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t.id} type="button" onClick={t.onRemove} className="chip">
              {t.label}
              <X className="h-3 w-3 opacity-70" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

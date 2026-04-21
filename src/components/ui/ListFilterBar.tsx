'use client'

import { Search, X } from 'lucide-react'
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
  /** Wenn true: Status-Filter wird außerhalb (z. B. FilterChips) gerendert. */
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
  searchPlaceholder = 'Suche…',
  onReset,
  hasActiveFilters,
  tags,
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
  className?: string
}) {
  const selectClass =
    'min-h-[40px] min-w-0 rounded-full border border-bw-border bg-bw-card px-3 py-2 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30 md:rounded-lg'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mobil: Chips-Zeile */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {!hideStatusFilter ? (
        <select
          aria-label={statusLabel}
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value)}
          className={cn(selectClass, 'max-w-[42%] flex-1')}
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
            className={cn(selectClass, 'max-w-[42%] flex-1')}
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
          className={cn(selectClass, 'min-w-[120px] flex-1')}
        >
          {ZEITRAUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 rounded-full border border-bw-border bg-bw-card px-3 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-bw-light" aria-hidden />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-bw-text placeholder:text-bw-light focus:outline-none"
          />
        </label>
      </div>

      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 md:hidden">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={t.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-bw-border bg-bw-bg px-2.5 py-1 text-xs font-medium text-bw-text"
            >
              {t.label}
              <X className="h-3.5 w-3.5 text-bw-light" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {/* Desktop */}
      <div className="hidden rounded-lg border border-bw-border bg-bw-card p-3 shadow-card md:block">
        <div className="flex flex-wrap items-end gap-3">
          {!hideStatusFilter ? (
          <label className="block min-w-[140px] max-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-bw-mid">{statusLabel}</span>
            <select
              value={statusValue}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30"
            >
              {statusOptions.map((o) => (
                <option key={`${o.value}-${o.label}`} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          ) : null}
          {secondaryFilter ? (
            <label className="block min-w-[140px] max-w-[200px] flex-1">
              <span className="mb-1 block text-xs font-medium text-bw-mid">{secondaryFilter.label}</span>
              <select
                value={secondaryFilter.value}
                onChange={(e) => secondaryFilter.onChange(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30"
              >
                {secondaryFilter.options.map((o) => (
                  <option key={`${o.value}-${o.label}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block min-w-[160px] max-w-[220px] flex-1">
            <span className="mb-1 block text-xs font-medium text-bw-mid">Zeitraum</span>
            <select
              value={zeitraumValue}
              onChange={(e) => onZeitraumChange(e.target.value as ZeitraumPreset)}
              className="w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30"
            >
              {ZEITRAUM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showCustomDates ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="block min-w-[160px]">
              <span className="mb-1 block text-xs font-medium text-bw-mid">Von</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30"
              />
            </label>
            <label className="block min-w-[160px]">
              <span className="mb-1 block text-xs font-medium text-bw-mid">Bis</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-sm text-bw-text focus:border-bw-primary focus:outline-none focus:ring-2 focus:ring-bw-primary/30"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block min-w-0 flex-1 md:min-w-[240px]">
            <span className="mb-1 block text-xs font-medium text-bw-mid">Suche</span>
            <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3">
              <Search className="h-4 w-4 shrink-0 text-bw-light" aria-hidden />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-bw-text placeholder:text-bw-light focus:outline-none"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border px-4 text-sm font-medium transition-colors',
              hasActiveFilters
                ? 'border-bw-border text-bw-text hover:bg-bw-hover'
                : 'cursor-not-allowed border-bw-border/50 text-bw-light'
            )}
          >
            <X className="h-4 w-4" aria-hidden />
            Filter
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'
import { ExportCsvButton } from '@/components/ui/ExportCsvButton'
import { AppFilterPill, AppFilterRail } from '@/components/layout/app/AppFilterRail'
import {
  LIST_FILTER_ICON_BTN_CLASS,
  LIST_FILTER_PILL_SELECT_CLASS,
  LIST_FILTER_SELECT_CLASS,
} from '@/lib/list-filter-ui'
import { cn } from '@/lib/utils'
import type { ZeitraumPreset } from '@/lib/listZeitraum'
import { ZEITRAUM_OPTIONS } from '@/lib/listZeitraum'

type SelectOption = { value: string; label: string }

/**
 * Mobil: Sortierung, Zeitraum und weitere Filter als Pills (gleiche Höhe/Typo wie Desktop).
 */
export function AppListFilterRail({
  sort,
  zeitraumValue,
  onZeitraumChange,
  secondaryFilter,
  onExportClick,
  className,
}: {
  sort?: ReactNode
  zeitraumValue: ZeitraumPreset
  onZeitraumChange: (v: ZeitraumPreset) => void
  secondaryFilter?: {
    label: string
    options: SelectOption[]
    value: string
    onChange: (v: string) => void
  }
  onExportClick?: () => void
  className?: string
}) {
  return (
    <AppFilterRail className={cn('shrink-0', className)}>
      {sort ? <AppFilterPill>{sort}</AppFilterPill> : null}
      <AppFilterPill active={zeitraumValue !== 'alle'}>
        <select
          aria-label="Zeitraum"
          value={zeitraumValue}
          onChange={(e) => onZeitraumChange(e.target.value as ZeitraumPreset)}
          className={cn(LIST_FILTER_SELECT_CLASS, LIST_FILTER_PILL_SELECT_CLASS)}
        >
          {ZEITRAUM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </AppFilterPill>
      {secondaryFilter ? (
        <AppFilterPill active={Boolean(secondaryFilter.value)}>
          <select
            aria-label={secondaryFilter.label}
            value={secondaryFilter.value}
            onChange={(e) => secondaryFilter.onChange(e.target.value)}
            className={cn(LIST_FILTER_SELECT_CLASS, LIST_FILTER_PILL_SELECT_CLASS)}
          >
            {secondaryFilter.options.map((o) => (
              <option key={`${o.value}-${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </AppFilterPill>
      ) : null}
      {onExportClick ? (
        <AppFilterPill>
          <ExportCsvButton
            variant="ghost"
            onClick={onExportClick}
            iconOnly
            className={LIST_FILTER_ICON_BTN_CLASS}
          />
        </AppFilterPill>
      ) : null}
    </AppFilterRail>
  )
}

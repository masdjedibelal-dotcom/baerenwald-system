'use client'

import { MockSelect } from '@/components/mock-ui/MockForm'
import type { ReactNode } from 'react'
import { ExportCsvButton } from '@/components/ui/ExportCsvButton'
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
 * Mobil: Sortierung, Zeitraum und weitere Filter als Chiprow (gleiche Höhe/Typo wie Desktop).
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
    <div
      className={cn(
        'chiprow flex shrink-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {sort ? <div className="shrink-0">{sort}</div> : null}
      <div className={cn('shrink-0', zeitraumValue !== 'alle' && 'filter-select-active')}>
        <MockSelect
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
        </MockSelect>
      </div>
      {secondaryFilter ? (
        <div className={cn('shrink-0', Boolean(secondaryFilter.value) && 'filter-select-active')}>
          <MockSelect
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
          </MockSelect>
        </div>
      ) : null}
      {onExportClick ? (
        <div className="shrink-0">
          <ExportCsvButton
            variant="ghost"
            onClick={onExportClick}
            iconOnly
            className={LIST_FILTER_ICON_BTN_CLASS}
          />
        </div>
      ) : null}
    </div>
  )
}

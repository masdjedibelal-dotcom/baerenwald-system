'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { AppSearchHit } from '@/lib/search/app-search-types'
import type { SearchGroupBlock } from '@/hooks/useAppSearch'
import { cn } from '@/lib/utils'

type Props = {
  groups: SearchGroupBlock[]
  selectedIndex: number
  onSelect: (hit: AppSearchHit) => void
  loading?: boolean
  emptyLabel?: string
  className?: string
  /** Flat index über alle Hits für Keyboard. */
  flatHits?: AppSearchHit[]
}

export function SearchResultsGrouped({
  groups,
  selectedIndex,
  onSelect,
  loading,
  emptyLabel = 'Keine Treffer',
  className,
}: Props) {
  const flat = groups.flatMap((g) => g.hits)
  if (!loading && flat.length === 0) {
    return (
      <p className={cn('px-3 py-4 text-sm text-bw-text-muted', className)}>{emptyLabel}</p>
    )
  }

  let idx = -1
  return (
    <div className={cn('max-h-80 overflow-y-auto py-1', className)} role="listbox">
      {loading && flat.length === 0 ? (
        <p className="px-3 py-3 text-sm text-bw-text-muted">Suche…</p>
      ) : null}
      {groups.map((g) => (
        <div key={g.group} className="mb-1">
          <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
            {g.label}
          </div>
          {g.hits.map((h) => {
            idx += 1
            const active = idx === selectedIndex
            return (
              <MockBtn
                key={h.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  active ? 'bg-bw-hover' : 'hover:bg-bw-hover/60'
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(h)
                }}
              >
                <MockIcon n={h.icon as 'search'} ctx="default" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-bw-text">{h.label}</span>
                  {h.sub ? (
                    <span className="block truncate text-xs text-bw-text-muted">{h.sub}</span>
                  ) : null}
                </span>
              </MockBtn>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function flattenSearchGroups(groups: SearchGroupBlock[]): AppSearchHit[] {
  return groups.flatMap((g) => g.hits)
}

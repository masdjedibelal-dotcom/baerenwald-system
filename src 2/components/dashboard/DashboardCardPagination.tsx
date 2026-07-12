'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const pagerBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-bw-text-muted transition-colors hover:bg-bw-surface-muted hover:text-bw-text disabled:pointer-events-none disabled:opacity-40'

type DashboardCardPaginationProps = {
  rangeFrom: number
  rangeTo: number
  total: number
  pageIndex: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  className?: string
}

export function DashboardCardPagination({
  rangeFrom,
  rangeTo,
  total,
  pageIndex,
  totalPages,
  onPrev,
  onNext,
  className,
}: DashboardCardPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-t border-bw-border px-4 py-2',
        className
      )}
    >
      <span className="text-xs tabular-nums text-bw-text-muted">
        {rangeFrom}–{rangeTo} von {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={pagerBtn}
          onClick={onPrev}
          disabled={pageIndex === 0}
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-[2.75rem] text-center text-xs tabular-nums text-bw-text-muted">
          {pageIndex + 1}/{totalPages}
        </span>
        <button
          type="button"
          className={pagerBtn}
          onClick={onNext}
          disabled={pageIndex >= totalPages - 1}
          aria-label="Nächste Seite"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

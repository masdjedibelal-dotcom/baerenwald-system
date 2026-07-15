'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type ListPaginationProps = {
  pageIndex: number
  totalPages: number
  total: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
  className?: string
}

/** Mock-Fußzeile: Ergebnisanzahl + Seiten-Navigation. */
export function ListPagination({
  pageIndex,
  totalPages,
  total,
  pageSize,
  onPrev,
  onNext,
  className,
}: ListPaginationProps) {
  if (total <= pageSize) return null

  const from = pageIndex * pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pageSize)

  return (
    <div className={cn('list-pagination', className)}>
      <p className="list-pagination__meta">
        {from}–{to} von {total}
      </p>
      <div className="list-pagination__controls">
        <button
          type="button"
          className="list-pagination__btn"
          onClick={onPrev}
          disabled={pageIndex <= 0}
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="list-pagination__page">
          Seite {pageIndex + 1} / {totalPages}
        </span>
        <button
          type="button"
          className="list-pagination__btn"
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

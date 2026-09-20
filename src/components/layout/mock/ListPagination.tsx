'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
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
        <MockBtn className="list-pagination__btn" type="button" onClick={onPrev} disabled={pageIndex <= 0} aria-label="Vorherige Seite">
          <MockIcon n="chevron-left" ctx="default" className="h-4 w-4" aria-hidden />
        </MockBtn>
        <span className="list-pagination__page">
          Seite {pageIndex + 1} / {totalPages}
        </span>
        <MockBtn className="list-pagination__btn" type="button" onClick={onNext} disabled={pageIndex >= totalPages - 1} aria-label="Nächste Seite">
          <MockIcon n="chevron-right" ctx="default" className="h-4 w-4" aria-hidden />
        </MockBtn>
      </div>
    </div>
  )
}

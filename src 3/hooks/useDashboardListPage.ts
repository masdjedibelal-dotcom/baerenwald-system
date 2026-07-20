'use client'

import { useEffect, useMemo, useState } from 'react'
import { DASHBOARD_LIST_PAGE_SIZE } from '@/components/dashboard/dashboard-list-utils'

export function useDashboardListPage<T>(
  items: T[],
  pageSize = DASHBOARD_LIST_PAGE_SIZE,
  resetKey?: string | number
) {
  const [pageIndex, setPageIndex] = useState(0)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPageIndex(0)
  }, [resetKey])

  useEffect(() => {
    setPageIndex((p) => Math.min(p, Math.max(0, totalPages - 1)))
  }, [totalPages])

  const safePage = Math.min(pageIndex, totalPages - 1)

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize]
  )

  const rangeFrom = total === 0 ? 0 : safePage * pageSize + 1
  const rangeTo = Math.min(total, (safePage + 1) * pageSize)

  return {
    pageItems,
    pageIndex: safePage,
    totalPages,
    total,
    rangeFrom,
    rangeTo,
    goPrev: () => setPageIndex((p) => Math.max(0, p - 1)),
    goNext: () => setPageIndex((p) => Math.min(totalPages - 1, p + 1)),
  }
}

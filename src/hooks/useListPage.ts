'use client'

import { useEffect, useMemo, useState } from 'react'

export const DEFAULT_LIST_PAGE_SIZE = 25

export function useListPage<T>(items: T[], pageSize = DEFAULT_LIST_PAGE_SIZE, resetKey?: string | number) {
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

  return {
    pageItems,
    pageIndex: safePage,
    totalPages,
    total,
    pageSize,
    setPageIndex,
    canPrev: safePage > 0,
    canNext: safePage < totalPages - 1,
    goPrev: () => setPageIndex((p) => Math.max(0, p - 1)),
    goNext: () => setPageIndex((p) => Math.min(totalPages - 1, p + 1)),
  }
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export const DEFAULT_LIST_PAGE_SIZE = 25

export function useListPage<T>(items: T[], pageSize = DEFAULT_LIST_PAGE_SIZE, resetKey?: string | number) {
  const [pageIndex, setPageIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPageIndex(0)
    setVisibleCount(pageSize)
  }, [resetKey, pageSize])

  useEffect(() => {
    setPageIndex((p) => Math.min(p, Math.max(0, totalPages - 1)))
  }, [totalPages])

  useEffect(() => {
    setVisibleCount((c) => Math.min(Math.max(c, pageSize), Math.max(pageSize, total)))
  }, [total, pageSize])

  const safePage = Math.min(pageIndex, totalPages - 1)

  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize]
  )

  const infiniteItems = useMemo(
    () => items.slice(0, Math.min(visibleCount, total)),
    [items, visibleCount, total]
  )

  const hasMore = infiniteItems.length < total

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + pageSize, total))
  }, [pageSize, total])

  return {
    pageItems,
    infiniteItems,
    hasMore,
    loadMore,
    visibleCount: infiniteItems.length,
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

'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type ListUrlStateKeys = {
  q?: string
  filter?: string
  tab?: string
  lifecycle?: string
  sort?: string
  seite?: string
  /** Alias für Portal `page` → wird als `seite` geschrieben wenn writePageAs=seite */
  page?: string
}

type Options = {
  /** Welche Keys synchronisiert werden. */
  keys?: (keyof ListUrlStateKeys)[]
  /** Portal nutzt oft `page` statt `seite`. */
  pageParam?: 'seite' | 'page'
  /** Debounce für q-Updates (ms). 0 = sofort. */
  replace?: boolean
}

/**
 * N6: Listen-State nur in der URL (q, filter/tab/lifecycle, sort, seite).
 * Kein localStorage für Filter.
 */
export function useListUrlState(opts: Options = {}) {
  const {
    keys = ['q', 'filter', 'tab', 'lifecycle', 'sort', 'seite'],
    pageParam = 'seite',
    replace = true,
  } = opts
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = useMemo(() => {
    const q = keys.includes('q') ? searchParams.get('q') ?? '' : ''
    const filter = keys.includes('filter') ? searchParams.get('filter') ?? '' : ''
    const tab =
      keys.includes('tab')
        ? searchParams.get('tab') ?? searchParams.get('phase') ?? ''
        : ''
    const lifecycle = keys.includes('lifecycle')
      ? searchParams.get('lifecycle') ?? ''
      : ''
    const sort = keys.includes('sort') ? searchParams.get('sort') ?? '' : ''
    const seiteRaw =
      pageParam === 'page'
        ? searchParams.get('page')
        : searchParams.get('seite')
    const seite = keys.includes('seite') || keys.includes('page')
      ? Math.max(1, parseInt(seiteRaw || '1', 10) || 1)
      : 1
    return { q, filter, tab, lifecycle, sort, seite }
  }, [searchParams, keys, pageParam])

  const setState = useCallback(
    (patch: Partial<ListUrlStateKeys & { seite: number; page: number }>) => {
      const params = new URLSearchParams(searchParams.toString())
      const apply = (key: string, val: string | number | undefined | null) => {
        const isPageKey = key === 'seite' || key === 'page'
        const empty =
          val === undefined ||
          val === null ||
          val === '' ||
          (isPageKey && (val === 1 || val === '1'))
        if (empty) {
          if (isPageKey) {
            params.delete('seite')
            params.delete('page')
          } else {
            params.delete(key)
            if (key === 'tab') params.delete('phase')
          }
          return
        }
        params.set(key, String(val))
      }

      if ('q' in patch && keys.includes('q')) apply('q', patch.q)
      if ('filter' in patch && keys.includes('filter')) apply('filter', patch.filter)
      if ('tab' in patch && keys.includes('tab')) {
        apply('tab', patch.tab)
        params.delete('phase')
      }
      if ('lifecycle' in patch && keys.includes('lifecycle'))
        apply('lifecycle', patch.lifecycle)
      if ('sort' in patch && keys.includes('sort')) apply('sort', patch.sort)
      if (('seite' in patch || 'page' in patch) && (keys.includes('seite') || keys.includes('page'))) {
        const n = patch.seite ?? patch.page ?? 1
        apply(pageParam, n)
        if (pageParam === 'seite') params.delete('page')
        else params.delete('seite')
      }

      const qs = params.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      if (replace) router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    },
    [router, pathname, searchParams, keys, pageParam, replace]
  )

  const listHrefWithState = useCallback(() => {
    const qs = searchParams.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  return { ...state, setState, listHrefWithState, searchParams, pathname }
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSearchHit, SearchGroupId } from '@/lib/search/app-search-types'
import { SEARCH_GROUP_LABELS } from '@/lib/search/app-search-types'

const RECENT_KEY = 'bw-crm-recent-search'

export type UseAppSearchOptions = {
  /** Min. Zeichen vor API-Call (TopBar: 2, Palette: 1 mit Nav). */
  minChars?: number
  debounceMs?: number
  /** Navigation-Hits lokal mischen (⌘K). */
  includeNav?: boolean
  navHits?: AppSearchHit[]
  apiPath?: string
  maxHits?: number
}

export type SearchGroupBlock = {
  group: SearchGroupId
  label: string
  hits: AppSearchHit[]
}

const DEFAULT_NAV: AppSearchHit[] = [
  {
    id: 'nav-vg',
    group: 'navigation',
    icon: 'folders',
    label: 'Vorgänge',
    sub: 'Navigation',
    href: '/vorgaenge',
  },
  {
    id: 'nav-k',
    group: 'navigation',
    icon: 'users',
    label: 'Kunden',
    sub: 'Navigation',
    href: '/kunden',
  },
  {
    id: 'nav-hw',
    group: 'navigation',
    icon: 'tool',
    label: 'Partner',
    sub: 'Navigation',
    href: '/handwerker',
  },
  {
    id: 'nav-kal',
    group: 'navigation',
    icon: 'calendar',
    label: 'Kalender',
    sub: 'Navigation',
    href: '/kalender',
  },
  {
    id: 'nav-set',
    group: 'navigation',
    icon: 'settings',
    label: 'Einstellungen',
    sub: 'Navigation',
    href: '/einstellungen',
  },
]

export function useAppSearch(opts: UseAppSearchOptions = {}) {
  const {
    minChars = 2,
    debounceMs = 220,
    includeNav = false,
    navHits = DEFAULT_NAV,
    apiPath = '/api/crm/suche',
    maxHits = 14,
  } = opts

  const [q, setQ] = useState('')
  const [hits, setHits] = useState<AppSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw) as string[])
    } catch {
      /* ignore */
    }
  }, [])

  const addRecent = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return
    setRecent((r) => {
      const next = [t, ...r.filter((x) => x !== t)].slice(0, 5)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    const needle = q.trim()
    if (needle.length < minChars) {
      setHits([])
      setLoading(false)
      return
    }

    const navFiltered = includeNav
      ? navHits.filter(
          (h) =>
            h.label.toLowerCase().includes(needle.toLowerCase()) ||
            h.sub?.toLowerCase().includes(needle.toLowerCase())
        )
      : []

    const ctrl = new AbortController()
    setLoading(true)
    const t = window.setTimeout(() => {
      fetch(`${apiPath}?q=${encodeURIComponent(needle)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { hits?: AppSearchHit[] }) => {
          const entity = (data.hits ?? []).map((h) => ({
            ...h,
            group: h.group ?? ('vorgaenge' as SearchGroupId),
          }))
          setHits([...navFiltered, ...entity].slice(0, maxHits))
        })
        .catch(() => setHits(navFiltered))
        .finally(() => setLoading(false))
    }, debounceMs)

    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [q, minChars, debounceMs, includeNav, navHits, apiPath, maxHits])

  const groups: SearchGroupBlock[] = useMemo(() => {
    const order: SearchGroupId[] = [
      'navigation',
      'vorgaenge',
      'kunden',
      'objekte',
      'partner',
      'dokumente',
    ]
    const map = new Map<SearchGroupId, AppSearchHit[]>()
    for (const h of hits) {
      const g = h.group
      const arr = map.get(g) ?? []
      arr.push(h)
      map.set(g, arr)
    }
    return order
      .filter((g) => (map.get(g)?.length ?? 0) > 0)
      .map((g) => ({
        group: g,
        label: SEARCH_GROUP_LABELS[g],
        hits: map.get(g) ?? [],
      }))
  }, [hits])

  return {
    q,
    setQ,
    hits,
    groups,
    loading,
    recent,
    addRecent,
    clearHits: () => setHits([]),
  }
}

'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

const RECENT_KEY = 'bw-crm-recent-search'

type SearchHit = {
  id: string
  icon: string
  label: string
  sub?: string
  href: string
}

const NAV_HITS: SearchHit[] = [
  { id: 'nav-dash', icon: 'layout-dashboard', label: 'Dashboard', sub: 'Navigation', href: '/' },
  { id: 'nav-vg', icon: 'folders', label: 'Vorgänge', sub: 'Navigation', href: '/vorgaenge' },
  { id: 'nav-k', icon: 'users', label: 'Kunden', sub: 'Navigation', href: '/kunden' },
  { id: 'nav-hw', icon: 'tool', label: 'Handwerker', sub: 'Navigation', href: '/handwerker' },
  { id: 'nav-p', icon: 'building', label: 'Partner', sub: 'Navigation', href: '/partner' },
  { id: 'nav-kal', icon: 'calendar', label: 'Kalender', sub: 'Navigation', href: '/kalender' },
  { id: 'nav-set', icon: 'settings', label: 'Einstellungen', sub: 'Navigation', href: '/einstellungen' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw) as string[])
    } catch {
      /* ignore */
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
  }, [open])

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
    const needle = q.trim().toLowerCase()
    if (!needle) {
      setHits([])
      return
    }

    const navFiltered = NAV_HITS.filter(
      (h) => h.label.toLowerCase().includes(needle) || h.sub?.toLowerCase().includes(needle)
    )

    const ctrl = new AbortController()
    setLoading(true)
    fetch(`/api/crm/suche?q=${encodeURIComponent(needle)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: { hits?: SearchHit[] }) => {
        const entityHits = data.hits ?? []
        setHits([...navFiltered, ...entityHits].slice(0, 12))
      })
      .catch(() => setHits(navFiltered))
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [q])

  useEffect(() => {
    setSel(0)
  }, [q])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => Math.min(s + 1, Math.max(0, hits.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const c = hits[sel]
        if (c) {
          addRecent(q)
          onClose()
          router.push(c.href)
        } else if (q.trim()) {
          addRecent(q)
          onClose()
          router.push(`/vorgaenge?q=${encodeURIComponent(q.trim())}`)
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, hits, sel, q, onClose, router, addRecent])

  if (!open) return null

  return (
    <div
      className="cmdk-overlay cmdk-pop"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('cmdk-overlay')) onClose()
      }}
      role="presentation"
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Suche">
        <div className="cmdk-input">
          <MockIcon n="search" size={18} style={{ color: 'var(--text-3)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Kundenname, Titel, Nummer, Ort…"
            autoFocus
          />
          <kbd>ESC</kbd>
        </div>
        <div className="cmdk-list">
          {q.trim() ? (
            loading && hits.length === 0 ? (
              <div className="cmdk-empty">Suche…</div>
            ) : hits.length === 0 ? (
              <div className="cmdk-empty">Keine Treffer für „{q}"</div>
            ) : (
              hits.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn('cmdk-item', i === sel && 'sel')}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => {
                    addRecent(q)
                    onClose()
                    router.push(c.href)
                  }}
                >
                  <MockIcon n={c.icon || 'arrow-right'} size={16} />
                  <span style={{ flex: 1 }}>{c.label}</span>
                  {c.sub ? <span className="hint">{c.sub}</span> : null}
                </button>
              ))
            )
          ) : recent.length ? (
            <>
              <div className="cmdk-group">Letzte Suchen</div>
              {recent.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="cmdk-item"
                  onClick={() => setQ(r)}
                >
                  <MockIcon n="clock" size={16} style={{ color: 'var(--text-3)' }} />
                  <span style={{ flex: 1 }}>{r}</span>
                </button>
              ))}
            </>
          ) : (
            <div className="cmdk-empty">Tippe, um zu suchen</div>
          )}
        </div>
      </div>
    </div>
  )
}

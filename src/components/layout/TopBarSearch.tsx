'use client'

import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

type SearchHit = {
  id: string
  icon: string
  label: string
  sub?: string
  href: string
}

const RECENT_KEY = 'bw-crm-recent-search'

function groupLabel(sub?: string): string {
  const s = (sub ?? '').split('·')[0]?.trim().toLowerCase() ?? ''
  if (s.startsWith('anfrage')) return 'Anfragen'
  if (s.startsWith('kunde')) return 'Kunden'
  if (s.startsWith('auftrag')) return 'Aufträge'
  if (s.startsWith('handwerker')) return 'Handwerker'
  if (s.startsWith('partner')) return 'Handwerker'
  if (s.startsWith('angebot')) return 'Angebote'
  if (s.startsWith('rechnung')) return 'Rechnungen'
  if (s === 'navigation') return 'Navigation'
  return 'Treffer'
}

/**
 * Desktop: große Suchleiste in der Topbar + Ergebnisse als Card darunter.
 * Mobile: Icon öffnet Fullscreen-Sheet (kein transparentes Modal).
 */
export function TopBarSearch({ alwaysVisible = true }: { alwaysVisible?: boolean }) {
  const router = useRouter()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const [recent, setRecent] = useState<string[]>([])

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
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw) as string[])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const t = window.setTimeout(() => {
      fetch(`/api/crm/suche?q=${encodeURIComponent(needle)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { hits?: SearchHit[] }) => {
          setHits((data.hits ?? []).slice(0, 14))
          setSel(0)
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false))
    }, 220)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [q])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    /** ⌘K / / laufen über GlobalShortcuts → CommandPalette; TopBar bleibt klickbar + open-search */
    function onOpenEvent() {
      if (window.matchMedia('(max-width: 767px)').matches) setMobileOpen(true)
      else {
        setOpen(true)
        window.setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
    document.addEventListener('open-search', onOpenEvent)
    return () => {
      document.removeEventListener('open-search', onOpenEvent)
    }
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const t = window.setTimeout(() => mobileInputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [mobileOpen])

  function go(href: string) {
    addRecent(q)
    setOpen(false)
    setMobileOpen(false)
    setQ('')
    router.push(href)
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setMobileOpen(false)
      ;(e.target as HTMLInputElement).blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, Math.max(0, hits.length - 1)))
      setOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[sel]
      if (hit) go(hit.href)
      else if (q.trim().length >= 2) {
        addRecent(q)
        setOpen(false)
        setMobileOpen(false)
        router.push(`/vorgaenge?q=${encodeURIComponent(q.trim())}`)
      }
    }
  }

  const showPanel = open && (q.trim().length >= 2 || recent.length > 0 || loading)
  const groups = hits.reduce<Record<string, SearchHit[]>>((acc, h) => {
    const g = groupLabel(h.sub)
    ;(acc[g] ??= []).push(h)
    return acc
  }, {})

  function renderResults(compact?: boolean) {
    if (q.trim().length < 2) {
      if (!recent.length) {
        return <div className="search-empty">Mindestens 2 Zeichen eingeben…</div>
      }
      return (
        <>
          <div className="pop-h">Letzte Suchen</div>
          {recent.map((r) => (
            <button key={r} type="button" className="pop-item" onClick={() => setQ(r)}>
              <MockIcon ctx="default" n="clock" size={16} />
              <span style={{ flex: 1 }}>{r}</span>
            </button>
          ))}
        </>
      )
    }
    if (loading && hits.length === 0) {
      return <div className="search-empty">Suche…</div>
    }
    if (hits.length === 0) {
      return <div className="search-empty">Keine Treffer für „{q.trim()}“</div>
    }
    let flatIdx = -1
    return Object.entries(groups).map(([group, items]) => (
      <div key={group}>
        <div className="pop-h">{group}</div>
        {items.map((h) => {
          flatIdx += 1
          const i = flatIdx
          return (
            <button
              key={h.id}
              type="button"
              className={cn('pop-item', i === sel && 'is-sel')}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(h.href)}
            >
              <MockIcon ctx="default" n={h.icon || 'search'} size={compact ? 15 : 16} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 550 }}>{h.label}</span>
                {h.sub ? (
                  <span style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                    {h.sub}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    ))
  }

  return (
    <>
      {/* Desktop / Tablet: inline search + dropdown */}
      <div
        ref={wrapRef}
        className={cn('topbar-search', !alwaysVisible && 'topbar-search--optional')}
      >
        <div className={cn('topbar-search-field', open && 'is-open')}>
          <MockIcon ctx="default" n="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKey}
            placeholder="Suchen…"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showPanel}
            autoComplete="off"
          />
          {q ? (
            <button
              type="button"
              className="topbar-search-clear"
              aria-label="Suche leeren"
              onClick={() => {
                setQ('')
                inputRef.current?.focus()
              }}
            >
              <MockIcon ctx="default" n="x" size={14} />
            </button>
          ) : (
            <kbd className="topbar-search-kbd">⌘K</kbd>
          )}
        </div>
        {showPanel ? (
          <div id={listId} className="search-drop" role="listbox">
            {renderResults()}
          </div>
        ) : null}
      </div>

      {/* Mobile: Icon → Fullscreen-Sheet */}
      <button
        type="button"
        className="topbar-search-mobile-btn"
        aria-label="Suche öffnen"
        onClick={() => setMobileOpen(true)}
      >
        <MockIcon ctx="default" n="search" size={18} />
      </button>

      {mobileOpen ? (
        <div className="search-sheet" role="dialog" aria-modal="true" aria-label="Suche">
          <div className="search-sheet-bar">
            <MockIcon ctx="default" n="search" size={18} />
            <input
              ref={mobileInputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Suchen…"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setMobileOpen(false)
                setQ('')
              }}
            >
              Abbrechen
            </button>
          </div>
          <div className="search-sheet-body">{renderResults(true)}</div>
        </div>
      ) : null}
    </>
  )
}

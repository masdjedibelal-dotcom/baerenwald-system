'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockInput } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { SearchResultsGrouped } from '@/components/search/SearchResultsGrouped'
import { useAppSearch } from '@/hooks/useAppSearch'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Desktop: Suchleiste in der Topbar. Mobile: Fullscreen-Sheet.
 * Gleiche Logik wie CommandPalette → useAppSearch.
 */
export function TopBarSearch({ alwaysVisible = true }: { alwaysVisible?: boolean }) {
  const router = useRouter()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sel, setSel] = useState(0)

  const { q, setQ, groups, hits, loading, recent, addRecent } = useAppSearch({
    minChars: 2,
    debounceMs: 220,
    includeNav: false,
    maxHits: 14,
  })

  useEffect(() => {
    setSel(0)
  }, [q])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    function onOpenEvent() {
      if (window.matchMedia('(max-width: 767px)').matches) setMobileOpen(true)
      else {
        setOpen(true)
        window.setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
    document.addEventListener('open-search', onOpenEvent)
    return () => document.removeEventListener('open-search', onOpenEvent)
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

  function renderResults() {
    if (q.trim().length < 2) {
      if (!recent.length) {
        return <div className="search-empty">Mindestens 2 Zeichen eingeben…</div>
      }
      return (
        <>
          <div className="pop-h">Letzte Suchen</div>
          {recent.map((r) => (
            <MockBtn className="pop-item" key={r} type="button" onClick={() => setQ(r)}>
              <MockIcon ctx="default" n="clock" size={16} />
              <span style={{ flex: 1 }}>{r}</span>
            </MockBtn>
          ))}
        </>
      )
    }
    return (
      <SearchResultsGrouped
        groups={groups}
        selectedIndex={sel}
        loading={loading}
        emptyLabel={`Keine Treffer für „${q.trim()}“`}
        onSelect={(h) => go(h.href)}
        className="search-drop-inner"
      />
    )
  }

  return (
    <>
      <div
        ref={wrapRef}
        className={cn('topbar-search', !alwaysVisible && 'topbar-search--optional')}
      >
        <div className={cn('topbar-search-field', open && 'is-open')}>
          <MockIcon ctx="default" n="search" size={16} />
          <MockInput
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
            <MockBtn
              className="topbar-search-clear"
              type="button"
              aria-label="Suche leeren"
              onClick={() => {
                setQ('')
                inputRef.current?.focus()
              }}
            >
              <MockIcon ctx="default" n="x" size={14} />
            </MockBtn>
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

      <MockBtn
        className="topbar-search-mobile-btn"
        type="button"
        aria-label="Suche öffnen"
        onClick={() => setMobileOpen(true)}
      >
        <MockIcon ctx="default" n="search" size={18} />
      </MockBtn>

      {mobileOpen ? (
        <div className="search-sheet" role="dialog" aria-modal="true" aria-label="Suche">
          <div className="search-sheet-bar">
            <MockIcon ctx="default" n="search" size={18} />
            <MockInput
              ref={mobileInputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Suchen…"
              autoComplete="off"
            />
            <MockBtn
              kind="ghost"
              sm
              type="button"
              onClick={() => {
                setMobileOpen(false)
                setQ('')
              }}
            >
              Abbrechen
            </MockBtn>
          </div>
          <div className="search-sheet-body">{renderResults()}</div>
        </div>
      ) : null}
    </>
  )
}

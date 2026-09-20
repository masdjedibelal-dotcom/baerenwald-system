'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockInput } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  SearchResultsGrouped,
} from '@/components/search/SearchResultsGrouped'
import { useAppSearch } from '@/hooks/useAppSearch'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/** ⌘K — eine Suchlogik mit TopBarSearch via useAppSearch. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  useOverlayChromeLock(open)
  const router = useRouter()
  const [sel, setSel] = useState(0)
  const { q, setQ, groups, hits, loading, recent, addRecent } = useAppSearch({
    minChars: 1,
    debounceMs: 180,
    includeNav: true,
    maxHits: 12,
  })

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
  }, [open, setQ])

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
          <MockIcon ctx="default" n="search" size={18} />
          <MockInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Kundenname, Titel, Nummer, Ort…"
            autoFocus
          />
          <kbd>ESC</kbd>
        </div>
        <div className="cmdk-list">
          {q.trim() ? (
            <SearchResultsGrouped
              groups={groups}
              selectedIndex={sel}
              loading={loading}
              emptyLabel={`Keine Treffer für „${q}“`}
              onSelect={(c) => {
                addRecent(q)
                onClose()
                router.push(c.href)
              }}
            />
          ) : recent.length ? (
            <>
              <div className="cmdk-group">Letzte Suchen</div>
              {recent.map((r, i) => (
                <MockBtn className="cmdk-item" key={i} type="button" onClick={() => setQ(r)}>
                  <MockIcon ctx="default" n="clock" size={16} />
                  <span style={{ flex: 1 }}>{r}</span>
                </MockBtn>
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


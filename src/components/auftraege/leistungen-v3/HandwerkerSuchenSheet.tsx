'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import { handwerkerHatGewerkSlug } from '@/lib/handwerker/gewerk-match'
import { BEREICH_LABELS, cn } from '@/lib/utils'
import { handwerkerInitialen } from '@/components/auftraege/leistungen-v3/utils'

function gewerkeLabel(h: HandwerkerGewerkListeEintrag): string {
  const raw = h.gewerke ?? []
  if (!raw.length) return ''
  return raw
    .map((s) => BEREICH_LABELS[s] ?? s.replace(/_/g, ' '))
    .filter(Boolean)
    .join(' · ')
}

/**
 * Handwerker suchen: Desktop Split-over · mobil Bottom Sheet (gestapelt über Zuweisung).
 * Oben Gewerk-Chips + Suche — analog Position hinzufügen.
 */
export function HandwerkerSuchenSheet({
  open,
  onClose,
  gewerke = [],
  preferredGewerkSlug = null,
  selectedIds,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  gewerke?: { id: string; name: string; slug: string }[]
  preferredGewerkSlug?: string | null
  selectedIds: Set<string>
  onConfirm: (ids: Set<string>, rows: HandwerkerGewerkListeEintrag[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [q, setQ] = useState('')
  const [gewerkFilter, setGewerkFilter] = useState<string | null>(null)
  const [draft, setDraft] = useState<Set<string>>(() => new Set())

  const selectedKey = useMemo(() => Array.from(selectedIds).sort().join(','), [selectedIds])

  useEffect(() => {
    if (!open) return
    setQ('')
    setDraft(new Set(selectedIds))
    setGewerkFilter(preferredGewerkSlug?.trim() || null)
  }, [open, preferredGewerkSlug, selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps -- sync draft only when sheet opens / selection key changes

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void listHandwerkerAuswahlFuerGewerk({ gewerkId: null, gewerkSlug: null }).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        toast.error(r.message)
        setRows([])
        setLoading(false)
        return
      }
      const seen = new Set<string>()
      const out: HandwerkerGewerkListeEintrag[] = []
      for (const h of [...r.empfohlen, ...r.alle]) {
        if (seen.has(h.id)) continue
        seen.add(h.id)
        out.push(h)
      }
      setRows(out)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const chipGewerke = useMemo(() => {
    const fromProp = gewerke
      .filter((g) => g.slug?.trim())
      .map((g) => ({ slug: g.slug, name: g.name || g.slug }))
    if (fromProp.length) {
      return [...fromProp].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    }
    const slugs = new Set<string>()
    for (const h of rows) {
      for (const s of h.gewerke ?? []) {
        if (s.trim()) slugs.add(s)
      }
    }
    return Array.from(slugs)
      .map((slug) => ({
        slug,
        name: BEREICH_LABELS[slug] ?? slug.replace(/_/g, ' '),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [gewerke, rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((h) => {
      if (gewerkFilter && !handwerkerHatGewerkSlug(h.gewerke, gewerkFilter)) return false
      if (!needle) return true
      const hay = `${h.name} ${h.firma ?? ''} ${gewerkeLabel(h)}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, q, gewerkFilter])

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    onConfirm(
      draft,
      rows.filter((h) => draft.has(h.id))
    )
    onClose()
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Handwerker suchen"
      context="detail"
      size="lg"
      overlayClassName="editor-sheet-overlay--stack"
      onConfirm={confirm}
      confirmDisabled={draft.size === 0}
    >
      <div className="space-y-3">
        {chipGewerke.length > 0 ? (
          <div className="picker-sheet__chips" role="group" aria-label="Gewerk">
            <button
              type="button"
              className={cn('picker-sheet__chip', !gewerkFilter && 'is-active')}
              onClick={() => setGewerkFilter(null)}
            >
              Alle
            </button>
            {chipGewerke.map((g) => (
              <button
                key={g.slug}
                type="button"
                className={cn('picker-sheet__chip', gewerkFilter === g.slug && 'is-active')}
                onClick={() => setGewerkFilter(g.slug)}
              >
                {g.name}
              </button>
            ))}
          </div>
        ) : null}

        <input
          className="sel w-full"
          placeholder="Handwerker suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />

        {loading ? (
          <p className="picker-sheet__empty">Lädt…</p>
        ) : filtered.length === 0 ? (
          <p className="picker-sheet__empty">Keine Treffer.</p>
        ) : (
          <ul className="hw-anfrage-list hw-anfrage-list--picker">
            {filtered.map((h) => {
              const checked = draft.has(h.id)
              const displayName = h.firma?.trim() || h.name
              const label = gewerkeLabel(h) || '—'
              const rating = h.bewertung ?? null
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    className={cn('hw-anfrage-row', checked && 'is-selected')}
                    onClick={() => toggle(h.id)}
                  >
                    <span className={cn('hw-anfrage-check', checked && 'is-checked')} aria-hidden>
                      {checked ? '✓' : ''}
                    </span>
                    <span className="hw-anfrage-avatar" aria-hidden>
                      {handwerkerInitialen(displayName)}
                    </span>
                    <span className="hw-anfrage-row-text">
                      <span className="hw-anfrage-row-name">{displayName}</span>
                      <span className="hw-anfrage-row-meta">
                        {label}
                        {rating != null ? (
                          <>
                            {' '}
                            <span className="hw-anfrage-star">★</span> {rating.toFixed(1)}
                          </>
                        ) : null}
                        {h.verfuegbar === false ? ' · Im Einsatz' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </EditorSheet>
  )
}

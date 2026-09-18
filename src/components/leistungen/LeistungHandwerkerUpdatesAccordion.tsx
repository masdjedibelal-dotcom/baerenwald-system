'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MediaThumb, MediaThumbStrip } from '@/components/shared/MediaThumb'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
import { cn } from '@/lib/utils'
import type { LeistungRow } from '@/components/leistungen/types'

type Update = NonNullable<LeistungRow['handwerkerUpdates']>[number]

function fmtDatumZeit(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) {
    const day = v.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const [y, m, dd] = day.split('-')
      return `${dd}.${m}.${y}`
    }
    return v.slice(0, 16)
  }
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Accordion unter einer Leistung: Handwerker-Updates mit Foto-Vorschau.
 * Collapsed: Count + Thumbs. Default offen bei ≥1 Update.
 */
export function LeistungHandwerkerUpdatesAccordion({
  updates,
  className,
  defaultOpen,
  compact,
}: {
  updates: Update[]
  className?: string
  defaultOpen?: boolean
  /** Kompakt in Listenzeile — weniger Padding. */
  compact?: boolean
}) {
  const [listOpen, setListOpen] = useState(() => defaultOpen ?? updates.length > 0)
  const [openId, setOpenId] = useState<string | null>(null)

  if (updates.length === 0) return null

  const headerThumbs = updates.flatMap((u) => u.fotoUrls ?? []).filter(Boolean)

  return (
    <div className={cn('hw-upd', compact && 'hw-upd--compact', className)}>
      <button
        type="button"
        className="hw-upd__toggle"
        aria-expanded={listOpen}
        onClick={(e) => {
          e.stopPropagation()
          setListOpen((o) => !o)
        }}
      >
        <span className="hw-upd__toggle-label">
          {updates.length === 1 ? '1 Update' : `${updates.length} Updates`}
        </span>
        {!listOpen ? <MediaThumbStrip urls={headerThumbs} max={3} size="sm" /> : null}
        <ChevronDown
          className={cn('hw-upd__chev', listOpen && 'hw-upd__chev--open')}
          aria-hidden
        />
      </button>

      {listOpen ? (
        <ul className="hw-upd__list">
          {updates.map((u, i) => {
            const key = u.id ?? `${u.at ?? i}-${i}`
            const rowOpen = openId === key
            const label = eintragTypLabel(u.typ) || 'Update'
            const fotos = u.fotoUrls ?? []
            const preview =
              u.text?.trim() ||
              (fotos.length > 0 ? `${fotos.length} Foto(s)` : 'Ohne Text')
            return (
              <li key={key} className="hw-upd__item">
                <button
                  type="button"
                  className="hw-upd__row"
                  aria-expanded={rowOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenId(rowOpen ? null : key)
                  }}
                >
                  <div className="hw-upd__row-main">
                    <div className="hw-upd__row-head">
                      <span className="hw-upd__typ">{label}</span>
                      <span className="hw-upd__datum">{fmtDatumZeit(u.at)}</span>
                      {u.zeitLabel ? (
                        <span className="hw-upd__zeit">{u.zeitLabel} Std.</span>
                      ) : null}
                    </div>
                    {!rowOpen ? <p className="hw-upd__preview">{preview}</p> : null}
                  </div>
                  {!rowOpen ? <MediaThumbStrip urls={fotos} max={2} size="sm" /> : null}
                  <ChevronDown
                    className={cn('hw-upd__chev', rowOpen && 'hw-upd__chev--open')}
                    aria-hidden
                  />
                </button>
                {rowOpen ? (
                  <div className="hw-upd__detail">
                    {u.text?.trim() ? (
                      <p className="hw-upd__text">{u.text.trim()}</p>
                    ) : (
                      <p className="hw-upd__text hw-upd__text--empty">Kein Text</p>
                    )}
                    {fotos.length > 0 ? (
                      <div className="hw-upd__fotos">
                        {fotos.map((url, fi) => (
                          <MediaThumb
                            key={`${key}-f-${fi}`}
                            src={url}
                            alt={`Foto ${fi + 1}`}
                            size="md"
                            className="hw-upd__foto-img"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

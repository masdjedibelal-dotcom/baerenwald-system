'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MediaThumb } from '@/components/shared/MediaThumb'
import { cn } from '@/lib/utils'
import type { LeistungRow } from '@/components/leistungen/types'
import { formatDatumZeit } from '@/lib/format/geld-datum'

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
  return formatDatumZeit(v)
}

function realText(u: Update): string {
  const t = u.text?.trim() ?? ''
  if (!t || /^update$/i.test(t)) return ''
  return t
}

function FotoLightbox({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="bt-foto-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      onClick={onClose}
    >
      <MockBtn
        className="bt-foto-lightbox__close"
        type="button"
        aria-label="Schließen"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <MockIcon n="x" ctx="default" size={20} />
      </MockBtn>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="bt-foto-lightbox__img"
        onClick={(ev) => ev.stopPropagation()}
      />
    </div>,
    document.body
  )
}

/**
 * Partner-Updates an einer Leistung.
 * - `hint`: nur Zähler-Hinweis in der Leistungen-Liste
 * - `list`: Accordion im Positions-Sheet (Datum/Uhrzeit + Thumbs → Lightbox)
 */
export function LeistungHandwerkerUpdatesAccordion({
  updates,
  className,
  variant = 'list',
  defaultOpen,
}: {
  updates: Update[]
  className?: string
  /** hint = Listen-Chip; list = Sheet-Accordion */
  variant?: 'hint' | 'list'
  defaultOpen?: boolean
  compact?: boolean
}) {
  const [listOpen, setListOpen] = useState(() => defaultOpen ?? updates.length > 0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (updates.length === 0) return null

  if (variant === 'hint') {
    const n = updates.length
    return (
      <div className={cn('hw-upd-hint', className)} aria-label={`${n} Partner-Updates`}>
        <MockIcon n="camera" ctx="default" size={14} aria-hidden />
        <span>{n === 1 ? '1 Update' : `${n} Updates`}</span>
      </div>
    )
  }

  const headerThumbs = updates.flatMap((u) => u.fotoUrls ?? []).filter(Boolean)

  return (
    <div className={cn('hw-upd', className)}>
      <MockBtn
        className="hw-upd__toggle"
        type="button"
        aria-expanded={listOpen}
        onClick={(e) => {
          e.stopPropagation()
          setListOpen((o) => !o)
        }}
      >
        <span className="hw-upd__toggle-label">
          {updates.length === 1 ? '1 Update' : `${updates.length} Updates`}
        </span>
        {!listOpen ? (
          <div className="hw-upd__thumbs">
            {headerThumbs.slice(0, 3).map((url, i) => (
              <MediaThumb key={`h-${i}`} src={url} size="sm" href={null} />
            ))}
          </div>
        ) : null}
        <MockIcon
          n="chevron-down"
          ctx="default"
          className={cn('hw-upd__chev', listOpen && 'hw-upd__chev--open')}
          aria-hidden
        />
      </MockBtn>

      {listOpen ? (
        <ul className="hw-upd__list">
          {updates.map((u, i) => {
            const key = u.id ?? `${u.at ?? i}-${i}`
            const rowOpen = openId === key
            const fotos = (u.fotoUrls ?? []).filter(Boolean)
            const note = realText(u)
            const preview =
              note ||
              (fotos.length > 0 ? `${fotos.length} Foto(s)` : 'Ohne Text')
            return (
              <li key={key} className="hw-upd__item">
                <MockBtn
                  className="hw-upd__row"
                  type="button"
                  aria-expanded={rowOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenId(rowOpen ? null : key)
                  }}
                >
                  <div className="hw-upd__row-main">
                    <div className="hw-upd__row-head">
                      <span className="hw-upd__datum">{fmtDatumZeit(u.at)}</span>
                      {u.zeitLabel ? (
                        <span className="hw-upd__zeit">{u.zeitLabel} Std.</span>
                      ) : null}
                    </div>
                    {!rowOpen ? <p className="hw-upd__preview">{preview}</p> : null}
                  </div>
                  {!rowOpen && fotos.length > 0 ? (
                    <div className="hw-upd__thumbs">
                      {fotos.slice(0, 2).map((url, fi) => (
                        <MediaThumb
                          key={`${key}-p-${fi}`}
                          src={url}
                          size="sm"
                          href={null}
                          onClick={(e) => {
                            e.stopPropagation()
                            setLightboxUrl(url)
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <MockIcon
                    n="chevron-down"
                    ctx="row"
                    className={cn('hw-upd__chev', rowOpen && 'hw-upd__chev--open')}
                    aria-hidden
                  />
                </MockBtn>
                {rowOpen ? (
                  <div className="hw-upd__detail">
                    {note ? (
                      <p className="hw-upd__text">{note}</p>
                    ) : (
                      <p className="hw-upd__text hw-upd__text--empty">Kein Text</p>
                    )}
                    {fotos.length > 0 ? (
                      <div className="hw-upd__fotos">
                        {fotos.map((url, fi) => (
                          <div key={`${key}-f-${fi}`} className="hw-upd__foto-slot">
                            <MediaThumb
                              src={url}
                              alt={`Foto ${fi + 1}`}
                              size="md"
                              className="hw-upd__foto-img"
                              href={null}
                              onClick={(e) => {
                                e.stopPropagation()
                                setLightboxUrl(url)
                              }}
                            />
                          </div>
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

      {lightboxUrl ? (
        <FotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}
    </div>
  )
}

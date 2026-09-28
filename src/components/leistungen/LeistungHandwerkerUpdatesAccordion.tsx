'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useState } from 'react'
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

/**
 * Partner-Updates an einer Leistung.
 * - `hint`: nur Zähler-Hinweis in der Leistungen-Liste
 * - `list`: flache Zeilen im Positions-Sheet (Datum/Uhrzeit + Thumbs → Lightbox)
 */
export function LeistungHandwerkerUpdatesAccordion({
  updates,
  className,
  variant = 'list',
}: {
  updates: Update[]
  className?: string
  /** hint = Listen-Chip; list = Sheet-Detail */
  variant?: 'hint' | 'list'
  /** @deprecated — Accordion defaultet nicht mehr offen */
  defaultOpen?: boolean
  compact?: boolean
}) {
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

  return (
    <div className={cn('hw-upd', className)}>
      <ul className="hw-upd__list">
        {updates.map((u, i) => {
          const key = u.id ?? `${u.at ?? i}-${i}`
          const fotos = (u.fotoUrls ?? []).filter(Boolean)
          const note = realText(u)
          return (
            <li key={key} className="hw-upd__item">
              <div className="hw-upd__flat">
                <div className="hw-upd__flat-main">
                  <span className="hw-upd__datum">{fmtDatumZeit(u.at)}</span>
                  {u.zeitLabel ? (
                    <span className="hw-upd__zeit">{u.zeitLabel} Std.</span>
                  ) : null}
                  {note ? <p className="hw-upd__note">{note}</p> : null}
                </div>
                {fotos.length > 0 ? (
                  <div className="hw-upd__thumbs">
                    {fotos.map((url, fi) => (
                      <MediaThumb
                        key={`${key}-f-${fi}`}
                        src={url}
                        alt={`Foto ${fi + 1}`}
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
              </div>
            </li>
          )
        })}
      </ul>

      {lightboxUrl ? (
        <div
          className="bt-foto-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(ev) => {
            if (ev.key === 'Escape') setLightboxUrl(null)
          }}
        >
          <MockBtn
            className="bt-foto-lightbox__close"
            type="button"
            aria-label="Schließen"
            onClick={() => setLightboxUrl(null)}
          >
            <MockIcon n="x" ctx="default" size={20} />
          </MockBtn>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="bt-foto-lightbox__img"
            onClick={(ev) => ev.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  )
}

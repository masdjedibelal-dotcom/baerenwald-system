'use client'

import { useCallback, useEffect, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { eintragTypLabel, type PositionEintrag } from '@/lib/auftraege/position-lebenszyklus'
import { formatDatum } from '@/lib/utils'

export type BautagebuchListenEintrag = PositionEintrag & {
  leistungName?: string | null
}

function eintragZeit(e: BautagebuchListenEintrag): string {
  const raw = e.ereignis_zeit || e.created_at
  if (!raw) return '—'
  try {
    return formatDatum(raw.slice(0, 10))
  } catch {
    return raw.slice(0, 10)
  }
}

function eintragTitel(e: BautagebuchListenEintrag): string {
  const body = e.beschreibung?.trim() || e.beschreibung_roh?.trim() || ''
  if (body) {
    const first = body.split(/\n+/)[0]?.trim() ?? ''
    if (first.length > 0 && first.length <= 72) return first
    if (first.length > 72) return `${first.slice(0, 69)}…`
  }
  return eintragTypLabel(e.typ)
}

function eintragText(e: BautagebuchListenEintrag): string {
  const body = e.beschreibung?.trim() || e.beschreibung_roh?.trim() || ''
  if (!body) return ''
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) return ''
  return lines.slice(1).join(' ').slice(0, 160)
}

type LightboxState = { urls: string[]; index: number }

/**
 * Bautagebuch = Portal-Updates als Inserat-Cards.
 */
export function AuftragBautagebuchSection({
  eintraege,
  disabled,
  onAdd,
  onAnfordern,
}: {
  eintraege: BautagebuchListenEintrag[]
  disabled?: boolean
  onAdd: () => void
  onAnfordern?: () => void
}) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const closeLightbox = useCallback(() => setLightbox(null), [])

  const stepLightbox = useCallback((delta: number) => {
    setLightbox((prev) => {
      if (!prev || prev.urls.length <= 1) return prev
      const next = (prev.index + delta + prev.urls.length) % prev.urls.length
      return { ...prev, index: next }
    })
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stepLightbox(-1)
      if (e.key === 'ArrowRight') stepLightbox(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, stepLightbox])

  const sorted = [...eintraege].sort((a, b) => {
    const ta = a.ereignis_zeit || a.created_at || ''
    const tb = b.ereignis_zeit || b.created_at || ''
    return tb.localeCompare(ta)
  })

  const activeUrl = lightbox ? lightbox.urls[lightbox.index] : null

  return (
    <section className="bt-feed" aria-label="Bautagebuch">
      <div className="bt-feed-h">
        <div className="bt-feed-h__left">
          <h2 className="bt-feed-title">Bautagebuch</h2>
          <p className="bt-feed-sub">
            {sorted.length === 0
              ? 'Updates fürs Kundenportal — Fotos, Titel, Text'
              : `${sorted.length} Eintrag${sorted.length === 1 ? '' : 'e'}`}
          </p>
        </div>
        {!disabled ? (
          <div className="bt-feed-h__actions">
            {onAnfordern ? (
              <Button type="button" variant="secondary" size="sm" onClick={onAnfordern}>
                Anfordern
              </Button>
            ) : null}
            <button
              type="button"
              className="btn primary sm bt-feed-h__add"
              onClick={onAdd}
              aria-label="Eintrag hinzufügen"
              title="Eintrag hinzufügen"
            >
              <MockIcon ctx="btn" n="plus" size={18} />
            </button>
          </div>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="bt-feed-empty">
          <MockIcon ctx="empty" n="camera" size={28} />
          <p>Noch keine Einträge.</p>
          <p className="bt-feed-empty__hint">
            Einträge erscheinen im Kundenportal.
          </p>
        </div>
      ) : (
        <ul className="bt-inserat-list">
          {sorted.map((e) => {
            const fotos = (e.eintrag_fotos ?? [])
              .map((f) => f.display_url)
              .filter((u): u is string => Boolean(u))
            const cover = fotos[0]
            const desc = eintragText(e)
            const stunden =
              e.zeit_minuten != null && e.zeit_minuten > 0
                ? `${Math.floor(e.zeit_minuten / 60)}:${String(e.zeit_minuten % 60).padStart(2, '0')} Std.`
                : null
            return (
              <li key={e.id} className="bt-inserat">
                {cover ? (
                  <button
                    type="button"
                    className="bt-inserat__media bt-inserat__media--clickable"
                    onClick={() => setLightbox({ urls: fotos, index: 0 })}
                    aria-label={
                      fotos.length > 1
                        ? `Foto vergrößern (${fotos.length} Fotos)`
                        : 'Foto vergrößern'
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" />
                    {fotos.length > 1 ? (
                      <span className="bt-inserat__count">+{fotos.length - 1}</span>
                    ) : null}
                  </button>
                ) : (
                  <div className="bt-inserat__media" aria-hidden>
                    <div className="bt-inserat__media-empty">
                      <Camera className="h-7 w-7 opacity-35" />
                    </div>
                  </div>
                )}
                <div className="bt-inserat__body">
                  <div className="bt-inserat__title">{eintragTitel(e)}</div>
                  {desc ? <p className="bt-inserat__desc">{desc}</p> : null}
                  <div className="bt-inserat__meta">
                    <span>{eintragZeit(e)}</span>
                    {e.leistungName?.trim() ? (
                      <span className="bt-inserat__chip">{e.leistungName.trim()}</span>
                    ) : (
                      <span className="bt-inserat__chip bt-inserat__chip--muted">ohne Bezug</span>
                    )}
                    {stunden ? (
                      <span className="bt-inserat__intern" title="Nur intern">
                        {stunden}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={Boolean(lightbox && activeUrl)}
        onClose={closeLightbox}
        title="Foto"
        subtitle={
          lightbox && lightbox.urls.length > 1
            ? `${lightbox.index + 1} / ${lightbox.urls.length}`
            : undefined
        }
        size="xl"
        footer={
          <button type="button" className="btn primary sm" onClick={closeLightbox}>
            <X className="h-4 w-4" aria-hidden />
            Schließen
          </button>
        }
      >
        {activeUrl ? (
          <div className="bt-foto-lightbox">
            {lightbox && lightbox.urls.length > 1 ? (
              <button
                type="button"
                className="bt-foto-lightbox__nav bt-foto-lightbox__nav--prev"
                onClick={() => stepLightbox(-1)}
                aria-label="Vorheriges Foto"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeUrl} alt="Bautagebuch-Foto" className="bt-foto-lightbox__img" />
            {lightbox && lightbox.urls.length > 1 ? (
              <button
                type="button"
                className="bt-foto-lightbox__nav bt-foto-lightbox__nav--next"
                onClick={() => stepLightbox(1)}
                aria-label="Nächstes Foto"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  )
}

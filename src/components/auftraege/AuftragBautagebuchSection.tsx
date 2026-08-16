'use client'

import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { eintragTypLabel, type PositionEintrag } from '@/lib/auftraege/position-lebenszyklus'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type BautagebuchListenEintrag = PositionEintrag & {
  leistungName?: string | null
  handwerkerName?: string | null
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

function eintragVolltext(e: BautagebuchListenEintrag): string {
  return (e.beschreibung?.trim() || e.beschreibung_roh?.trim() || '').trim()
}

function eintragTitel(e: BautagebuchListenEintrag): string {
  const body = eintragVolltext(e)
  if (body) {
    const first = body.split(/\n+/)[0]?.trim() ?? ''
    if (first.length > 0 && first.length <= 72) return first
    if (first.length > 72) return `${first.slice(0, 69)}…`
  }
  return eintragTypLabel(e.typ)
}

function eintragText(e: BautagebuchListenEintrag): string {
  const body = eintragVolltext(e)
  if (!body) return ''
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) {
    // Lange Einzeiler: Vorschau kürzen, Detail im Sheet
    return body.length > 160 ? `${body.slice(0, 157)}…` : ''
  }
  return lines.slice(1).join(' ').slice(0, 220)
}

function typChipClass(typ: string): string {
  const t = typ.toLowerCase()
  if (t === 'start') return 'bt-inserat__typ--start'
  if (t === 'ergebnis') return 'bt-inserat__typ--ende'
  if (t === 'fortschritt') return 'bt-inserat__typ--fort'
  if (t === 'weitere_arbeit') return 'bt-inserat__typ--nachtrag'
  return 'bt-inserat__typ--notiz'
}

/**
 * Bautagebuch = Portal-Updates als Inserat-Cards.
 * Klick öffnet Sheet mit vollem Text + Fotos (Zoom).
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const sorted = [...eintraege]
    .filter((e) => String(e.typ).toLowerCase() !== 'weitere_arbeit')
    .sort((a, b) => {
      const ta = a.ereignis_zeit || a.created_at || ''
      const tb = b.ereignis_zeit || b.created_at || ''
      return tb.localeCompare(ta)
    })

  const active = openId ? sorted.find((e) => e.id === openId) ?? null : null
  const activeFotos = (active?.eintrag_fotos ?? []).filter((f) => f.display_url)
  const activeText = active ? eintragVolltext(active) : ''
  const activeStunden =
    active?.zeit_minuten != null && active.zeit_minuten > 0
      ? `${Math.floor(active.zeit_minuten / 60)}:${String(active.zeit_minuten % 60).padStart(2, '0')} Std.`
      : null

  return (
    <section className="bt-feed" aria-label="Bautagebuch">
      <div className="bt-feed-h">
        <div className="bt-feed-h__left">
          <h2 className="bt-feed-title">Bautagebuch</h2>
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
        </div>
      ) : (
        <ul className="bt-inserat-list">
          {sorted.map((e) => {
            const fotos = e.eintrag_fotos ?? []
            const visibleFotos = fotos.filter((f) => f.display_url)
            const cover = visibleFotos[0]?.display_url
            const hasFotoSlot = fotos.length > 0
            const desc = eintragText(e)
            const stunden =
              e.zeit_minuten != null && e.zeit_minuten > 0
                ? `${Math.floor(e.zeit_minuten / 60)}:${String(e.zeit_minuten % 60).padStart(2, '0')} Std.`
                : null
            const vonPartner =
              String(e.erfasst_von ?? '').includes('partner') ||
              String(e.erfasst_von ?? '').includes('eigenbetrieb')
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={cn(
                    'bt-inserat',
                    'bt-inserat--clickable',
                    !hasFotoSlot && 'bt-inserat--text-only'
                  )}
                  onClick={() => {
                    setLightboxUrl(null)
                    setOpenId(e.id)
                  }}
                >
                  {hasFotoSlot ? (
                    <div className="bt-inserat__media" aria-hidden>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" />
                      ) : (
                        <div className="bt-inserat__media-empty">
                          <Camera className="h-7 w-7 opacity-35" />
                          <span className="bt-inserat__media-hint">Foto nicht ladbar</span>
                        </div>
                      )}
                      {visibleFotos.length > 1 ? (
                        <span className="bt-inserat__count">+{visibleFotos.length - 1}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="bt-inserat__body">
                    <div className="bt-inserat__head">
                      <span className={cn('bt-inserat__typ', typChipClass(e.typ))}>
                        {eintragTypLabel(e.typ)}
                      </span>
                      {vonPartner ? (
                        <span className="bt-inserat__src">Handwerker</span>
                      ) : (
                        <span className="bt-inserat__src">CRM</span>
                      )}
                    </div>
                    <div className="bt-inserat__title">{eintragTitel(e)}</div>
                    {desc ? <p className="bt-inserat__desc">{desc}</p> : null}
                    <div className="bt-inserat__meta">
                      <span>{eintragZeit(e)}</span>
                      {e.handwerkerName?.trim() ? (
                        <span className="bt-inserat__chip">{e.handwerkerName.trim()}</span>
                      ) : null}
                      {e.leistungName?.trim() ? (
                        <span className="bt-inserat__chip bt-inserat__chip--muted">
                          {e.leistungName.trim()}
                        </span>
                      ) : (
                        <span className="bt-inserat__chip bt-inserat__chip--muted">ohne Bezug</span>
                      )}
                      {stunden ? (
                        <span className="bt-inserat__zeit" title="Erfasste Zeit">
                          {stunden}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <EditorSheet
        open={Boolean(active)}
        onClose={() => {
          setLightboxUrl(null)
          setOpenId(null)
        }}
        title={active ? eintragTypLabel(active.typ) : 'Eintrag'}
        subtitle={active ? eintragZeit(active) : null}
        size="md"
      >
        {active ? (
          <div className="bt-eintrag-sheet">
            <div className="bt-eintrag-sheet__meta">
              {String(active.erfasst_von ?? '').includes('partner') ||
              String(active.erfasst_von ?? '').includes('eigenbetrieb') ? (
                <span className="bt-inserat__src">Handwerker</span>
              ) : (
                <span className="bt-inserat__src">CRM</span>
              )}
              {active.handwerkerName?.trim() ? (
                <span className="bt-inserat__chip">{active.handwerkerName.trim()}</span>
              ) : null}
              {active.leistungName?.trim() ? (
                <span className="bt-inserat__chip bt-inserat__chip--muted">
                  {active.leistungName.trim()}
                </span>
              ) : null}
              {activeStunden ? (
                <span className="bt-inserat__zeit">{activeStunden}</span>
              ) : null}
            </div>

            {activeText ? (
              <p className="bt-eintrag-sheet__text">{activeText}</p>
            ) : (
              <p className="bt-eintrag-sheet__empty">Kein Text hinterlegt.</p>
            )}

            {activeFotos.length > 0 ? (
              <div className="bt-eintrag-sheet__fotos" aria-label="Fotos">
                {activeFotos.map((f) => (
                  <button
                    key={f.id ?? f.display_url}
                    type="button"
                    className="bt-eintrag-sheet__foto"
                    onClick={() => setLightboxUrl(f.display_url!)}
                    aria-label="Foto vergrößern"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.display_url!} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </EditorSheet>

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
          <button
            type="button"
            className="bt-foto-lightbox__close"
            aria-label="Schließen"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={20} strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="bt-foto-lightbox__img"
            onClick={(ev) => ev.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  )
}

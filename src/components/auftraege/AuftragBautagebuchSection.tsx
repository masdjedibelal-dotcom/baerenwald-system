'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { confirmAction } from '@/components/ui/confirm-action'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { deleteCrmTagebuchEintrag } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import type { CrmTagebuchEditSeed } from '@/components/auftraege/CrmPositionEintragModal'
import type { PositionEintrag } from '@/lib/auftraege/position-lebenszyklus'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type BautagebuchListenEintrag = PositionEintrag & {
  leistungName?: string | null
  /** Mehrere Leistungen (Junction), Anzeige mit Komma. */
  leistungNames?: string[]
  handwerkerName?: string | null
}

function isPartnerEintrag(e: BautagebuchListenEintrag): boolean {
  const von = String(e.erfasst_von ?? '')
  return von.includes('partner') || von.includes('eigenbetrieb')
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
  return 'Tagebuch-Eintrag'
}

function eintragText(e: BautagebuchListenEintrag): string {
  const body = eintragVolltext(e)
  if (!body) return ''
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) {
    return body.length > 160 ? `${body.slice(0, 157)}…` : ''
  }
  return lines.slice(1).join(' ').slice(0, 220)
}

function toEditSeed(e: BautagebuchListenEintrag): CrmTagebuchEditSeed {
  const ids =
    e.leistung_position_ids?.length
      ? e.leistung_position_ids
      : e.position_id
        ? [e.position_id]
        : []
  return {
    id: e.id,
    positionIds: ids,
    beschreibungRaw: e.beschreibung ?? e.beschreibung_roh ?? null,
    fotoPaths: (e.eintrag_fotos ?? [])
      .map((f) => String(f.storage_path ?? '').trim())
      .filter(Boolean),
  }
}

/**
 * Bautagebuch = CRM-Tagebuch-Einträge.
 * HW-Leistungs-Updates gehören unter Leistungen — hier ausgeblendet.
 */
export function AuftragBautagebuchSection({
  eintraege,
  auftragId,
  disabled,
  onAdd,
  onEdit,
  onChanged,
}: {
  eintraege: BautagebuchListenEintrag[]
  auftragId: string
  disabled?: boolean
  onAdd: () => void
  onEdit: (seed: CrmTagebuchEditSeed) => void
  onChanged?: () => void
}) {
  const isMobile = useIsMobile()
  const [openId, setOpenId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const sorted = [...eintraege]
    .filter((e) => {
      const typ = String(e.typ).toLowerCase()
      if (typ === 'weitere_arbeit') return false
      if (isPartnerEintrag(e)) return false
      return true
    })
    .sort((a, b) => {
      const ta = a.ereignis_zeit || a.created_at || ''
      const tb = b.ereignis_zeit || b.created_at || ''
      return tb.localeCompare(ta)
    })

  const active = openId ? sorted.find((e) => e.id === openId) ?? null : null
  const activeFotos = (active?.eintrag_fotos ?? []).filter((f) => f.display_url || f.storage_path)
  const activeText = active ? eintragVolltext(active) : ''
  const activeStunden =
    active?.zeit_minuten != null && active.zeit_minuten > 0
      ? `${Math.floor(active.zeit_minuten / 60)}:${String(active.zeit_minuten % 60).padStart(2, '0')} Std.`
      : null

  function closeDetail() {
    setLightboxUrl(null)
    setOpenId(null)
  }

  function startEdit(e: BautagebuchListenEintrag) {
    closeDetail()
    onEdit(toEditSeed(e))
  }

  function askDelete(e: BautagebuchListenEintrag) {
    confirmAction({
      title: 'Eintrag löschen?',
      body: 'Der Tagebuch-Eintrag und zugehörige Fotos werden unwiderruflich gelöscht.',
      confirmLabel: 'Löschen',
      danger: true,
      busyLabel: 'Eintrag wird gelöscht…',
      onConfirm: async () => {
        setDeletePending(true)
        try {
          await actionBusy.run('Eintrag wird gelöscht…', async () => {
            const r = await deleteCrmTagebuchEintrag({
              eintragId: e.id,
              auftragId,
            })
            if (!r.ok) {
              toast.error(r.message)
              throw new Error(r.message)
            }
            toast.success('Eintrag gelöscht')
            closeDetail()
            onChanged?.()
          })
        } finally {
          setDeletePending(false)
        }
      },
    })
  }

  return (
    <section className="bt-feed" aria-label="Bautagebuch">
      <div className="bt-feed-h">
        <div className="bt-feed-h__left">
          <h2 className="bt-feed-title">Bautagebuch</h2>
        </div>
        {!disabled ? (
          <div className="bt-feed-h__actions">
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
            const visibleFotos = (e.eintrag_fotos ?? []).filter((f) => f.display_url)
            const cover = visibleFotos[0]?.display_url
            const hasFotoSlot = (e.eintrag_fotos?.length ?? 0) > 0
            const desc = eintragText(e)
            const card = (
              <button
                type="button"
                className={cn(
                  'bt-inserat',
                  'bt-inserat--clickable',
                  !hasFotoSlot && 'bt-inserat--text-only'
                )}
                onClick={() => setOpenId(e.id)}
              >
                {hasFotoSlot ? (
                  <div className="bt-inserat__media" aria-hidden>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" />
                    ) : (
                      <div className="bt-inserat__media-empty">
                        <MockIcon ctx="empty" n="camera" size={20} />
                        <span className="bt-inserat__media-hint">Foto nicht ladbar</span>
                      </div>
                    )}
                    {visibleFotos.length > 1 ? (
                      <span className="bt-inserat__count">+{visibleFotos.length - 1}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="bt-inserat__body">
                  <div className="bt-inserat__title">{eintragTitel(e)}</div>
                  {desc ? <p className="bt-inserat__desc">{desc}</p> : null}
                  <div className="bt-inserat__meta">
                    <span>{eintragZeit(e)}</span>
                    {e.leistungName?.trim() || e.leistungNames?.length ? (
                      <span className="bt-inserat__chip bt-inserat__chip--muted">
                        {(e.leistungNames?.length
                          ? e.leistungNames
                          : [e.leistungName!.trim()]
                        ).join(', ')}
                      </span>
                    ) : (
                      <span className="bt-inserat__chip bt-inserat__chip--muted">ohne Bezug</span>
                    )}
                    {e.zeit_minuten != null && e.zeit_minuten > 0 ? (
                      <span className="bt-inserat__zeit" title="Erfasste Zeit">
                        {Math.floor(e.zeit_minuten / 60)}:
                        {String(e.zeit_minuten % 60).padStart(2, '0')} Std.
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            )

            return (
              <li key={e.id}>
                {!disabled && isMobile ? (
                  <SwipeRow
                    leftActions={[
                      {
                        icon: 'trash',
                        label: 'Löschen',
                        onClick: () => askDelete(e),
                        tone: 'danger',
                      },
                    ]}
                    rightActions={[
                      {
                        icon: 'pencil',
                        label: 'Bearbeiten',
                        onClick: () => startEdit(e),
                        tone: 'primary',
                      },
                    ]}
                  >
                    {card}
                  </SwipeRow>
                ) : (
                  card
                )}
              </li>
            )
          })}
        </ul>
      )}

      <EditorSheet
        open={Boolean(active)}
        onClose={closeDetail}
        title={active ? eintragTitel(active) : 'Tagebuch-Eintrag'}
        subtitle={active ? eintragZeit(active) : null}
        size="md"
        footer={
          active && !disabled ? (
            <div className="sheet-footer-actions ldr-cta">
              <Button
                type="button"
                variant="danger"
                disabled={deletePending}
                onClick={() => askDelete(active)}
              >
                Löschen
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={deletePending}
                onClick={() => startEdit(active)}
              >
                Bearbeiten
              </Button>
            </div>
          ) : null
        }
      >
        {active ? (
          <div className="bt-eintrag-sheet">
            <div className="bt-eintrag-sheet__meta">
              {active.leistungName?.trim() || active.leistungNames?.length ? (
                <span className="bt-inserat__chip bt-inserat__chip--muted">
                  {(active.leistungNames?.length
                    ? active.leistungNames
                    : [active.leistungName!.trim()]
                  ).join(', ')}
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
                {activeFotos.map((f) => {
                  const src = f.display_url || f.storage_path
                  if (!src) return null
                  return (
                    <button
                      key={f.id ?? src}
                      type="button"
                      className="bt-eintrag-sheet__foto"
                      onClick={() => setLightboxUrl(src)}
                      aria-label="Foto vergrößern"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                    </button>
                  )
                })}
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

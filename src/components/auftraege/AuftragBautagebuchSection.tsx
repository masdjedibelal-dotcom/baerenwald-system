'use client'

import { Camera } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
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

function eintragText(e: BautagebuchListenEintrag): string {
  const body = e.beschreibung?.trim() || e.beschreibung_roh?.trim() || ''
  if (body) return body
  return eintragTypLabel(e.typ)
}

/**
 * Bautagebuch unter den Leistungen — Verlauf + „+ Eintrag“ (Mock Surface B).
 * Abnahme / Abschlussbericht bleiben über Aktionen erreichbar.
 */
export function AuftragBautagebuchSection({
  eintraege,
  disabled,
  onAdd,
}: {
  eintraege: BautagebuchListenEintrag[]
  disabled?: boolean
  onAdd: () => void
}) {
  const sorted = [...eintraege].sort((a, b) => {
    const ta = a.ereignis_zeit || a.created_at || ''
    const tb = b.ereignis_zeit || b.created_at || ''
    return tb.localeCompare(ta)
  })

  return (
    <section className="bt-sec space-y-3" aria-label="Bautagebuch">
      <div className="bt-sec-h">
        <div className="bt-sec-h__left">
          <MockIcon ctx="default" n="clipboard-list" size={18} />
          <div>
            <h2 className="bt-sec-title">Bautagebuch</h2>
            <p className="bt-sec-sub">
              {sorted.length === 0
                ? 'Optional · laufende Updates von Baustelle und Partner'
                : `${sorted.length} Eintrag${sorted.length === 1 ? '' : 'e'} · optional Soft-Bezug zur Leistung`}
            </p>
          </div>
        </div>
        {!disabled ? (
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            + Eintrag
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="bt-empty">
          <p>Noch keine Einträge.</p>
          <p className="bt-empty__hint">
            Freie Updates (Wetter, Regie, Fortschritt) — ohne Zwang auf Angebotszeilen. Abnahme
            und Abschlussbericht startest du über Aktionen.
          </p>
          {!disabled ? (
            <button type="button" className="lt-add-entry" onClick={onAdd}>
              + Eintrag hinzufügen
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="bt-list">
          {sorted.map((e) => {
            const foto = e.eintrag_fotos?.find((f) => f.display_url)?.display_url
            const fotoCount = e.eintrag_fotos?.length ?? 0
            return (
              <li key={e.id} className="bt-entry">
                <span className="bt-check on" aria-hidden>
                  <MockIcon ctx="default" n="check" size={12} />
                </span>
                {foto ? (
                  <div className="bt-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto} alt="" />
                    {fotoCount > 1 ? <span className="count">+{fotoCount - 1}</span> : null}
                  </div>
                ) : (
                  <div className="bt-thumb" aria-hidden>
                    <Camera className="h-5 w-5 opacity-40" />
                  </div>
                )}
                <div className="bt-main">
                  <div className="bt-title">
                    <span>{eintragTypLabel(e.typ)}</span>
                    {e.leistungName?.trim() ? (
                      <span className="badge warten">{e.leistungName.trim()}</span>
                    ) : (
                      <span className="badge warten">Ohne Leistung</span>
                    )}
                  </div>
                  <p className="bt-desc">{eintragText(e)}</p>
                  <p className="bt-meta">{eintragZeit(e)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

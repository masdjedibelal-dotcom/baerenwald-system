'use client'

import { AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDatum } from '@/lib/utils'
import type { LeistungMangelAnzeige } from '@/components/leistungen/types'

/**
 * Mock „OFFENE MÄNGEL“ — über der Leistungen-Tabelle am Auftrag.
 */
export function LeistungenMaengelCard({ maengel }: { maengel: LeistungMangelAnzeige[] }) {
  const sichtbar = maengel.filter((m) => m.status !== 'behoben')
  if (!sichtbar.length) return null

  const offen = sichtbar.filter((m) => m.status === 'offen').length
  const ueberfaellig = sichtbar.filter((m) => m.status === 'ueberfaellig').length
  const metaParts: string[] = []
  if (offen) metaParts.push(`${offen} offen`)
  if (ueberfaellig) metaParts.push(`${ueberfaellig} überfällig`)

  return (
    <div className="lt-maengel" role="region" aria-label="Offene Mängel">
      <div className="lt-maengel__head">
        <span className="lt-maengel__title">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Offene Mängel
        </span>
        {metaParts.length ? (
          <span className="lt-maengel__count">{metaParts.join(' · ')}</span>
        ) : null}
      </div>

      <div className="lt-maengel__cols" aria-hidden>
        <span>Mangel</span>
        <span>Frist</span>
      </div>

      <ul className="lt-maengel__list">
        {sichtbar.map((m) => (
          <li key={m.id} className="lt-maengel__row">
            <div className="lt-maengel__main">
              <div className="lt-maengel__text">{m.text}</div>
              {m.gewerk ? <div className="lt-maengel__gewerk">{m.gewerk}</div> : null}
            </div>
            <div className="lt-maengel__meta">
              <StatusBadge
                status={m.status === 'ueberfaellig' ? 'ueberfaellig' : m.status}
                label={
                  m.status === 'ueberfaellig'
                    ? 'Überfällig'
                    : m.status === 'behoben'
                      ? 'Behoben'
                      : 'Offen'
                }
              />
              {m.frist ? (
                <span className="lt-maengel__frist">{formatDatum(m.frist.slice(0, 10))}</span>
              ) : (
                <span className="lt-maengel__frist lt-dim">—</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="lt-maengel__note">
        Der Auftrag kann erst abgeschlossen werden, wenn alle Mängel behoben sind — oder als
        Abnahme unter Vorbehalt dokumentiert wird.
      </p>
    </div>
  )
}

'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import type { LeistungMangelAnzeige } from '@/components/leistungen/types'

/**
 * Mängel aus der Abnahme — offene Punkte mit Frist über der Leistungen-Tabelle.
 */
export function LeistungenMaengelCard({ maengel }: { maengel: LeistungMangelAnzeige[] }) {
  if (!maengel.length) return null

  return (
    <div className="lt-maengel" role="region" aria-label="Mängel">
      <div className="lt-maengel__head">Mängel</div>
      <ul className="lt-maengel__list">
        {maengel.map((m) => (
          <li key={m.id} className="lt-maengel__row">
            <div className="lt-maengel__text">{m.text}</div>
            <div className="lt-maengel__meta">
              {m.frist ? (
                <span className="lt-maengel__frist">Frist {m.frist.slice(0, 10)}</span>
              ) : (
                <span className="lt-maengel__frist lt-dim">Keine Frist</span>
              )}
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

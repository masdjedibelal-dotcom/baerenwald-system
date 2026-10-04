'use client'

import { useMemo, useState } from 'react'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockInput } from '@/components/mock-ui/MockForm'
import { formatEurBetrag } from '@/lib/dokument-zeilen'

export type PreislistenZeile = {
  id: string
  titel: string
  gewerk: string
  einheit: string
  preis: number
  /** Katalog = gepflegt, sonst zuletzt in Angebot/Auftrag/alter Preisliste */
  quelle: 'katalog' | 'verwendet'
}

/**
 * Preisliste = alle gespeicherten Positionen (eine Quelle, wie in der Positionsauswahl).
 * Preis = zuletzt verwendeter Einzelpreis netto.
 */
export function AllePositionenClient({ zeilen }: { zeilen: PreislistenZeile[] }) {
  const [suche, setSuche] = useState('')
  const [gewerk, setGewerk] = useState<string | null>(null)

  const gewerke = useMemo(
    () => Array.from(new Set(zeilen.map((z) => z.gewerk))).sort((a, b) => a.localeCompare(b, 'de')),
    [zeilen]
  )
  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    return zeilen.filter(
      (z) => (!gewerk || z.gewerk === gewerk) && (!q || z.titel.toLowerCase().includes(q))
    )
  }, [zeilen, suche, gewerk])

  return (
    <MockCard title={`Preisliste · ${zeilen.length}`} icon="list">
      <div className="preisliste-alle">
        <div className="input">
          <MockIcon ctx="default" n="search" />
          <MockInput type="text" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Position suchen…" aria-label="Position suchen" />
        </div>
        {gewerke.length > 1 ? (
          <div className="preisliste-alle__chips" role="group" aria-label="Gewerk">
            <MockChip active={!gewerk} onClick={() => setGewerk(null)}>
              Alle
            </MockChip>
            {gewerke.map((g) => (
              <MockChip key={g} active={gewerk === g} onClick={() => setGewerk(gewerk === g ? null : g)}>
                {g}
              </MockChip>
            ))}
          </div>
        ) : null}
        {gefiltert.length === 0 ? (
          <p className="preisliste-alle__leer">
            {zeilen.length === 0
              ? 'Noch keine Positionen. Sie erscheinen hier, sobald sie in einem Angebot oder Auftrag stehen.'
              : 'Keine Treffer.'}
          </p>
        ) : (
          <ul className="preisliste-alle__liste">
            {gefiltert.map((z) => (
              <li key={z.id} className="preisliste-alle__zeile">
                <span className="preisliste-alle__text">
                  <span className="preisliste-alle__titel">{z.titel}</span>
                  <span className="preisliste-alle__sub">
                    {z.gewerk}
                    {z.quelle === 'verwendet' ? ' · zuletzt verwendet' : ''}
                  </span>
                </span>
                <span className="preisliste-alle__preis">
                  {formatEurBetrag(z.preis)}
                  <span className="preisliste-alle__einheit"> / {z.einheit}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MockCard>
  )
}

'use client'

import { MockBtn, MockUebersichtCard } from '@/components/mock-ui'
import type { ObjektKpiSnapshot } from '@/lib/objektakte/compute-objekt-kpis'

export function ObjektUebersichtKpiCard({
  kpis,
  jahr,
  onHistorieClick,
  onBerichtClick,
}: {
  kpis: ObjektKpiSnapshot
  jahr: number
  onHistorieClick?: () => void
  onBerichtClick?: () => void
}) {
  const gewerkHint =
    kpis.nachGewerk.length > 0
      ? kpis.nachGewerk.slice(0, 3).map((g) => `${g.gewerk} (${g.count})`).join(' · ')
      : '—'

  return (
    <div className="card">
      <div className="card-h flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="card-title title">Kennzahlen</div>
          <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Objektübersicht — leere Register zeigen Nullen, keine Fehler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBerichtClick ? (
            <MockBtn sm kind="secondary" icon="file-text" onClick={onBerichtClick}>
              Bericht erstellen
            </MockBtn>
          ) : null}
        </div>
      </div>
      <div className="card-b space-y-4">
        <MockUebersichtCard
          stats={[
            {
              icon: 'folders',
              label: 'Vorgänge gesamt',
              value: onHistorieClick ? (
                <button type="button" className="ueber-val-btn" onClick={onHistorieClick}>
                  {kpis.vorgaengeGesamt}
                </button>
              ) : (
                kpis.vorgaengeGesamt
              ),
            },
            {
              icon: 'clock',
              label: 'Offen / in Arbeit',
              value: kpis.offenInArbeit,
            },
            {
              icon: 'euro',
              label: `Kosten ${jahr}`,
              value:
                kpis.kostenLaufendesJahr > 0
                  ? `${kpis.kostenLaufendesJahr.toLocaleString('de-DE')} €`
                  : '—',
            },
            {
              icon: 'tool',
              label: 'Anlagen im Register',
              value: kpis.anlagenAnzahl,
            },
          ]}
        />
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Nach Gewerk: {gewerkHint}
          {kpis.kostenOhneAngabeImJahr > 0
            ? ` · ${kpis.kostenOhneAngabeImJahr} Maßnahme${kpis.kostenOhneAngabeImJahr === 1 ? '' : 'n'} in ${jahr} ohne Kostenangabe`
            : ''}
        </p>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockUebersichtCard } from '@/components/mock-ui/MockUebersichtCard'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { ZeitraumIconPopover } from '@/components/ui/ZeitraumIconPopover'
import {
  buildKundeWirtschaft,
  KUNDE_WIRTSCHAFT_ZEITRAUM,
  type KundeWirtschaftZeitraum,
} from '@/lib/kunden/kunde-wirtschaft'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'
import { cn } from '@/lib/utils'

function formatEurGanz(n: number): string {
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

function UmsatzverlaufBars({
  monate,
}: {
  monate: { key: string; label: string; betrag: number }[]
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const max = Math.max(1, ...monate.map((m) => m.betrag))
  const lastWithValueIdx = (() => {
    for (let i = monate.length - 1; i >= 0; i--) {
      if (monate[i]!.betrag > 0) return i
    }
    return monate.length - 1
  })()

  return (
    <div className="kw-chart-bars">
      {monate.map((m, i) => {
        const h = m.betrag > 0 ? Math.max(8, Math.round((m.betrag / max) * 140)) : 3
        const isHighlight = i === lastWithValueIdx && m.betrag > 0
        const isHover = hoverKey === m.key
        return (
          <div
            key={m.key}
            className={cn('kw-chart-col', isHover && 'is-hover')}
            onMouseEnter={() => setHoverKey(m.key)}
            onMouseLeave={() => setHoverKey(null)}
            onFocus={() => setHoverKey(m.key)}
            onBlur={() => setHoverKey(null)}
            tabIndex={0}
            role="img"
            aria-label={`${m.label}: ${formatEurGanz(m.betrag)}`}
          >
            <div className="kw-chart-hit">
              {isHover ? (
                <div className="kw-chart-tip" role="tooltip">
                  <span className="kw-chart-tip-month">{m.label}</span>
                  <span className="kw-chart-tip-val">{formatEurGanz(m.betrag)}</span>
                </div>
              ) : null}
              <div
                className={cn(
                  'kw-chart-bar',
                  isHighlight && 'is-highlight',
                  isHover && 'is-hover'
                )}
                style={{ height: h }}
              />
            </div>
            <span className="kw-chart-label">{m.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function KundeWirtschaftlicheUebersicht({ kunde }: { kunde: KundeDetailPayload }) {
  const [zeitraum, setZeitraum] = useState<KundeWirtschaftZeitraum>('12m')
  const snap = useMemo(() => buildKundeWirtschaft(kunde, zeitraum), [kunde, zeitraum])

  const delta =
    snap.umsatzDeltaPct == null
      ? null
      : snap.umsatzDeltaPct > 0
        ? `+${snap.umsatzDeltaPct} % ggü. Vorperiode`
        : snap.umsatzDeltaPct < 0
          ? `${snap.umsatzDeltaPct} % ggü. Vorperiode`
          : `0 % ggü. Vorperiode`

  return (
    <div className="kw-uebersicht">
      <div className="kw-head">
        <h2 className="kw-title">Wirtschaftliche Übersicht</h2>
        <ZeitraumIconPopover
          value={zeitraum}
          options={KUNDE_WIRTSCHAFT_ZEITRAUM}
          onChange={setZeitraum}
          title="Zeitraum"
        />
      </div>

      <MockUebersichtCard
        stats={[
          {
            icon: 'euro',
            label: `Umsatz${zeitraum !== 'all' ? ` · ${snap.zeitraumLabelKurz}` : ''}${delta ? ` (${delta})` : ''}`,
            value: formatEurGanz(snap.umsatz),
          },
          {
            icon: 'receipt',
            label:
              snap.offenerBetrag > 0
                ? 'Offener Betrag · offene Posten'
                : 'Offener Betrag · keine offenen Posten',
            value: formatEurGanz(snap.offenerBetrag),
          },
          {
            icon: 'folders',
            label: `Aktive Vorgänge · ${snap.auftraegeGesamt} Auftrag${snap.auftraegeGesamt === 1 ? '' : 'e'} gesamt`,
            value: snap.aktiveVorgaenge,
          },
        ]}
      />

      <MockCard title="Umsatzverlauf" icon="activity">
        {snap.monate.every((m) => m.betrag <= 0) ? (
          <MockEmpty
            icon="activity"
            title="Noch kein Umsatz"
            hint="In diesem Zeitraum liegen noch keine Umsatzdaten vor."
          />
        ) : (
          <UmsatzverlaufBars monate={snap.monate} />
        )}
      </MockCard>
    </div>
  )
}

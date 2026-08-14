'use client'

import { useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ZeitraumIconPopover } from '@/components/ui/ZeitraumIconPopover'
import type { HandwerkerDetailPayload } from '@/app/(dashboard)/handwerker/actions'
import {
  buildPartnerWirtschaft,
  PARTNER_WIRTSCHAFT_ZEITRAUM,
  type PartnerWirtschaftZeitraum,
} from '@/lib/handwerker/partner-wirtschaft'
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

export function HandwerkerWirtschaftlicheUebersicht({
  payload,
}: {
  payload: HandwerkerDetailPayload
}) {
  const [zeitraum, setZeitraum] = useState<PartnerWirtschaftZeitraum>('12m')
  const snap = useMemo(() => buildPartnerWirtschaft(payload, zeitraum), [payload, zeitraum])

  const delta =
    snap.umsatzDeltaPct == null
      ? null
      : snap.umsatzDeltaPct > 0
        ? `+${snap.umsatzDeltaPct} % ggü. Vorperiode`
        : snap.umsatzDeltaPct < 0
          ? `${snap.umsatzDeltaPct} % ggü. Vorperiode`
          : `0 % ggü. Vorperiode`

  const gewerkMax = Math.max(1, ...snap.gewerke.map((g) => g.betrag))

  return (
    <div className="kw-uebersicht">
      <div className="kw-head">
        <h2 className="kw-title">Wirtschaftliche Übersicht</h2>
        <ZeitraumIconPopover
          value={zeitraum}
          options={PARTNER_WIRTSCHAFT_ZEITRAUM}
          onChange={setZeitraum}
          title="Zeitraum"
        />
      </div>

      <div className="kw-kpi-row">
        <div className="card kw-kpi is-accent">
          <div className="kw-kpi-label">
            Umsatz{zeitraum !== 'all' ? ` · ${snap.zeitraumLabelKurz}` : ''}
          </div>
          <div className="kw-kpi-val">{formatEurGanz(snap.umsatz)}</div>
          {delta ? (
            <div
              className={cn(
                'kw-kpi-meta',
                snap.umsatzDeltaPct != null && snap.umsatzDeltaPct > 0 && 'is-up',
                snap.umsatzDeltaPct != null && snap.umsatzDeltaPct < 0 && 'is-down'
              )}
            >
              {snap.umsatzDeltaPct != null && snap.umsatzDeltaPct !== 0 ? (
                <MockIcon
                  ctx="default"
                  n="trending-up"
                  size={13}
                  className={snap.umsatzDeltaPct < 0 ? 'kw-flip' : undefined}
                />
              ) : null}
              <span>{delta}</span>
            </div>
          ) : (
            <div className="kw-kpi-meta">Gesamtumsatz</div>
          )}
        </div>

        <div className="card kw-kpi">
          <div className="kw-kpi-label">Offenes Volumen</div>
          <div className="kw-kpi-val">{formatEurGanz(snap.offenesVolumen)}</div>
          <div className="kw-kpi-meta">aus laufenden Einsätzen</div>
        </div>

        <div className="card kw-kpi">
          <div className="kw-kpi-label">Aktive Einsätze</div>
          <div className="kw-kpi-val">{snap.aktiveEinsaetze}</div>
          <div className="kw-kpi-meta">
            {snap.anfragenGesamt} Anfrage{snap.anfragenGesamt === 1 ? '' : 'n'} gesamt
          </div>
        </div>
      </div>

      <div className="card kw-chart">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="activity" size={16} />
            Umsatzverlauf
          </div>
        </div>
        <div className="card-b">
          {snap.monate.every((m) => m.betrag <= 0) ? (
            <p className="kw-chart-empty">Noch kein Umsatz in diesem Zeitraum.</p>
          ) : (
            <UmsatzverlaufBars monate={snap.monate} />
          )}
        </div>
      </div>

      <div className="card pw-gewerk">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="activity" size={16} />
            Volumen nach Gewerk
          </div>
        </div>
        <div className="card-b">
          {snap.gewerke.length === 0 ? (
            <p className="kw-chart-empty" style={{ padding: '12px 0' }}>
              Noch kein Volumen nach Gewerk.
            </p>
          ) : (
            <ul className="pw-gewerk-list">
              {snap.gewerke.map((g) => (
                <li key={g.name} className="pw-gewerk-row">
                  <div className="pw-gewerk-top">
                    <span className="pw-gewerk-name" title={g.name}>
                      {g.name}
                    </span>
                    <span className="pw-gewerk-val">{formatEurGanz(g.betrag)}</span>
                  </div>
                  <div className="pw-gewerk-track">
                    <div
                      className="pw-gewerk-bar"
                      style={{
                        width: `${Math.max(6, Math.round((g.betrag / gewerkMax) * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

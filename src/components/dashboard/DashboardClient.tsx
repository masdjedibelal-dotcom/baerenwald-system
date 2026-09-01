'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { DashboardZeitraumFilterBar } from '@/components/dashboard/DashboardZeitraumFilterBar'
import { DashboardLazyMount } from '@/components/dashboard/DashboardLazyMount'
import {
  gewerkColor,
  type DashboardZeitraumFilter,
  type FunnelStufe,
  type GewerkUmsatzZeile,
  type RankingZeile,
  type UmsatzMonat,
  umsatzMonatGesamt,
} from '@/lib/dashboard/dashboard-analytics'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'
import { DashboardMarketingCard } from '@/components/dashboard/DashboardMarketingCard'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import {
  buildDashboardKpiSnapshot,
  DASHBOARD_KPI_ANALYSE_PROMPT,
} from '@/lib/dashboard/dashboard-kpi-snapshot'

export type DashboardKpi = {
  icon: string
  label: string
  value: number
  href: string
}

const UMSATZ_BAR_FILL = '#2E7D52'

function UmsatzBarChart({ months }: { months: UmsatzMonat[] }) {
  const safeMonths = Array.isArray(months) ? months : []
  const totals = safeMonths.map((m) => umsatzMonatGesamt(m))
  const max = Math.max(1, ...totals)
  const total = totals.reduce((s, n) => s + n, 0)

  const W = 360
  const H = 168
  const padL = 8
  const padR = 8
  const padT = 12
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = Math.max(1, safeMonths.length)
  const slot = innerW / n
  const barW = Math.min(28, Math.max(12, slot * 0.55))

  function yAt(v: number) {
    return padT + innerH - (v / max) * innerH
  }

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="activity" size={16} />
          Umsatzverlauf
        </div>
      </div>
      <div className="card-b">
        <div className="mb-3">
          <div className="text-[length:var(--fs-head)] font-semibold tracking-tight tabular-nums">
            {formatEurBetrag(total)}
          </div>
        </div>
        <div className="w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-44 w-full"
            role="img"
            aria-label="Umsatzverlauf Balkendiagramm"
          >
            {[0.25, 0.5, 0.75, 1].map((t) => (
              <line
                key={t}
                x1={padL}
                x2={W - padR}
                y1={yAt(max * t)}
                y2={yAt(max * t)}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
            ))}
            {safeMonths.map((m, i) => {
              const gesamt = umsatzMonatGesamt(m)
              const cx = padL + slot * i + slot / 2
              const x = cx - barW / 2
              const h = gesamt > 0 ? Math.max((gesamt / max) * innerH, 0.5) : 0
              const y = padT + innerH - h
              return (
                <g key={m.key}>
                  {gesamt > 0 ? (
                    <rect x={x} y={y} width={barW} height={h} rx={2} fill={UMSATZ_BAR_FILL}>
                      <title>{`${m.label}: ${formatEurBetrag(gesamt)}`}</title>
                    </rect>
                  ) : null}
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    className="fill-[var(--text-3)]"
                    style={{ fontSize: 11 }}
                  >
                    {m.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-[length:var(--fs-meta)]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-1.5 py-1.5 text-left font-medium text-[var(--text-3)]"> </th>
                {safeMonths.map((m) => (
                  <th
                    key={m.key}
                    className="px-1.5 py-1.5 text-right font-medium tabular-nums text-[var(--text-3)]"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)] font-semibold last:border-0">
                <td className="whitespace-nowrap px-1.5 py-1.5 text-[var(--text-2)]">Gesamt</td>
                {safeMonths.map((m) => (
                  <td
                    key={m.key}
                    className="px-1.5 py-1.5 text-right tabular-nums text-[var(--text)]"
                  >
                    {formatEurBetrag(umsatzMonatGesamt(m))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VertriebsFunnel({
  stufen,
  conversionGesamt,
}: {
  stufen: FunnelStufe[]
  conversionGesamt: number
}) {
  const isMobile = useIsMobile()
  const safeStufen = Array.isArray(stufen) ? stufen : []
  const maxCount = Math.max(1, ...safeStufen.map((s) => Number(s.count) || 0), 1)

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="filter" size={16} />
          Vertriebs-Funnel
        </div>
        <div className="text-[length:var(--fs-text)] text-[var(--text-2)]">
          Gesamt-Conversion{' '}
          <b className="tabular-nums text-[var(--text)]">{conversionGesamt}%</b>
        </div>
      </div>
      <div className="card-b space-y-2">
        {safeStufen.map((s) => {
          const width = Math.max(28, Math.round((s.count / maxCount) * 100))
          return (
            <div key={s.key}>
              {isMobile ? (
                <div className="vfunnel-row">
                  <span className="vfunnel-label">{s.label}</span>
                  <div className="vfunnel-track">
                    <div
                      className="vfunnel-bar"
                      style={{
                        width: `${width}%`,
                        background: s.color,
                      }}
                    >
                      <span className="vfunnel-nums tabular-nums">
                        {s.count}
                        <span className="vfunnel-pct"> · {s.rate}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="relative flex items-center justify-between rounded-lg px-3 py-2.5 text-white"
                  style={{
                    width: `${width}%`,
                    minWidth: '40%',
                    background: s.color,
                  }}
                >
                  <span className="text-[length:var(--fs-text)] font-medium">{s.label}</span>
                  <span className="text-[length:var(--fs-text)] font-semibold tabular-nums">
                    {s.count} <span className="font-normal opacity-80">· {s.rate}%</span>
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GewerkUmsatzCard({
  zeilen,
  gesamt,
}: {
  zeilen: GewerkUmsatzZeile[]
  gesamt: number
}) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="clock" size={16} />
          Umsatz nach Gewerk
        </div>
        <div className="text-[length:var(--fs-title)] font-semibold tabular-nums text-[var(--text)]">
          {formatEurBetrag(gesamt)}
        </div>
      </div>
      <div className="card-b">
        {(zeilen ?? []).length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-[var(--text-3)]">
            Noch keine beauftragten Umsätze mit Gewerken.
          </p>
        ) : (
          <div className="space-y-3">
            {(zeilen ?? []).slice(0, 5).map((z, i) => (
              <div key={z.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[length:var(--fs-text)] font-medium">{z.name}</span>
                  <span className="text-[length:var(--fs-meta)] tabular-nums text-[var(--text-2)]">
                    {formatEurBetrag(z.netto)}{' '}
                    <span className="text-[var(--text-3)]">({z.anteil}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-2)]">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${Math.max(z.anteil, z.netto > 0 ? 2 : 0)}%`,
                      background: gewerkColor(i),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const TOP_RANKING_LIMIT = 8

function TopRankingCard({
  handwerker,
  kunden,
}: {
  handwerker: RankingZeile[]
  kunden: RankingZeile[]
}) {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<'handwerker' | 'kunden'>('handwerker')
  const rows = (mode === 'handwerker' ? (handwerker ?? []) : (kunden ?? [])).slice(
    0,
    TOP_RANKING_LIMIT
  )
  const maxUmsatz = rows.length ? Math.max(1, ...rows.map((r) => Number(r.umsatz) || 0)) : 1

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="trophy" size={16} />
          Top-Ranking
        </div>
        <div className="seg" role="group" aria-label="Ranking-Modus">
          <button
            type="button"
            className={mode === 'handwerker' ? 'on' : undefined}
            onClick={() => setMode('handwerker')}
          >
            Handwerker
          </button>
          <button
            type="button"
            className={mode === 'kunden' ? 'on' : undefined}
            onClick={() => setMode('kunden')}
          >
            Kunden
          </button>
        </div>
      </div>
      <div className="card-b">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-[var(--text-3)]">
            Keine Daten im Zeitraum.
          </p>
        ) : isMobile ? (
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.id} className="flex gap-3">
                <span className="w-5 shrink-0 pt-0.5 text-[length:var(--fs-meta)] tabular-nums text-[var(--text-3)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[length:var(--fs-text)] font-medium">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[length:var(--fs-meta)] text-[var(--text-2)]">
                    <span className="font-medium tabular-nums text-[var(--text)]">
                      {formatEurBetrag(r.umsatz)}
                    </span>
                    <span className="tabular-nums text-[var(--text-3)]">
                      {r.vorgaenge} {r.vorgaenge === 1 ? 'Vorgang' : 'Vorgänge'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="list-row head"
              style={{
                gridTemplateColumns: '32px minmax(160px, 1.6fr) 88px minmax(110px, 1fr)',
                gap: 8,
              }}
            >
              <div>#</div>
              <div>{mode === 'handwerker' ? 'Handwerker' : 'Kunde'}</div>
              <div>Vorgänge</div>
              <div>Umsatz</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="list-row"
                style={{
                  gridTemplateColumns: '32px minmax(160px, 1.6fr) 88px minmax(110px, 1fr)',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div className="text-[length:var(--fs-meta)] tabular-nums text-[var(--text-3)]">
                  {i + 1}
                </div>
                <div className="min-w-0 truncate text-[length:var(--fs-text)] font-medium">
                  {r.name}
                </div>
                <div className="text-[length:var(--fs-text)] tabular-nums">{r.vorgaenge}</div>
                <div>
                  <div className="text-[length:var(--fs-text)] font-medium tabular-nums">
                    {formatEurBetrag(r.umsatz)}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((r.umsatz / maxUmsatz) * 100)}%`,
                        background: 'var(--green)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardClient({
  vorname,
  zeitraumFilter,
  kpis,
  marketing,
  umsatzMonate,
  funnel,
  gewerk,
  rankingHandwerker,
  rankingKunden,
}: {
  vorname: string
  zeitraumFilter: DashboardZeitraumFilter
  kpis: DashboardKpi[]
  marketing: DashboardMarketingSnapshot
  umsatzMonate: UmsatzMonat[]
  funnel: {
    stufen: FunnelStufe[]
    conversionGesamt: number
  }
  gewerk: { zeilen: GewerkUmsatzZeile[]; gesamt: number }
  rankingHandwerker: RankingZeile[]
  rankingKunden: RankingZeile[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { openAutoSession } = useAssistent()

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  }, [])

  const dateStr = useMemo(
    () =>
      new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  )

  /* Mobil: Dokument-Scroll — nach Navigation von langen Listen (z. B. Vorgänge) zurücksetzen */
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.querySelector<HTMLElement>('main.page')?.scrollTo(0, 0)
  }, [])

  function openKpiAnalyse() {
    const snapshot = buildDashboardKpiSnapshot({
      zeitraumFilter,
      kpis,
      marketing,
      umsatzMonate,
      funnel,
      gewerk,
      rankingHandwerker,
      rankingKunden,
    })
    openAutoSession({
      title: 'KI · Dashboard-Analyse',
      intro:
        'Ich analysiere jetzt die aktuell sichtbaren KPIs und Charts — aus Sicht eines Analysten für dich als Geschäftsführer.',
      contextExtra: snapshot,
      autoPrompt: DASHBOARD_KPI_ANALYSE_PROMPT,
    })
  }

  return (
    <div className="dashboard-page min-w-0 overflow-x-hidden">
      <header className="dash-hero mb-[22px] flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[length:var(--fs-text)] text-[var(--text-3)]">{dateStr}</div>
          <div className="mt-0.5 text-[length:var(--fs-head)] font-semibold tracking-tight">
            {greeting}, {vorname}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DashboardZeitraumFilterBar filter={zeitraumFilter} />
          <button
            type="button"
            className="ki-assist-icon-btn"
            title="KPIs mit KI analysieren"
            aria-label="KPIs mit KI analysieren"
            onClick={openKpiAnalyse}
          >
            <MockIcon ctx="btn" n="sparkles" size={16} />
          </button>
        </div>
      </header>

      <section className="dash-sec" aria-label="Heute">
        <div className="kpi-grid">
          {(kpis ?? []).map((k) => (
            <button
              key={k.label}
              type="button"
              className="kpi-card"
              onClick={() => router.push(k.href)}
            >
              <div className="kpi-ico">
                <MockIcon ctx="default" n={k.icon} size={isMobile ? 15 : 19} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="kpi-val">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dash-sec" aria-label="Marketing">
        <DashboardMarketingCard data={marketing} />
      </section>

      <section className="dash-sec dash-sec--zahlen" aria-label="Auswertung">
        <div className="dash-sec__title-row">
          <h2 className="dash-sec__title">Auswertung</h2>
        </div>
        <div className="dash-zahlen">
          <DashboardLazyMount minHeight={isMobile ? 200 : 260}>
            <UmsatzBarChart months={umsatzMonate} />
          </DashboardLazyMount>
          <DashboardLazyMount minHeight={isMobile ? 200 : 260}>
            <VertriebsFunnel
              stufen={funnel.stufen}
              conversionGesamt={funnel.conversionGesamt}
            />
          </DashboardLazyMount>
          <DashboardLazyMount minHeight={isMobile ? 200 : 260}>
            <GewerkUmsatzCard zeilen={gewerk.zeilen} gesamt={gewerk.gesamt} />
          </DashboardLazyMount>
          <DashboardLazyMount minHeight={isMobile ? 220 : 280}>
            <TopRankingCard handwerker={rankingHandwerker} kunden={rankingKunden} />
          </DashboardLazyMount>
        </div>
      </section>
    </div>
  )
}

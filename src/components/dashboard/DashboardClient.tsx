'use client'

import { useMemo, useState } from 'react'
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
} from '@/lib/dashboard/dashboard-analytics'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'
import { DashboardMarketingCard } from '@/components/dashboard/DashboardMarketingCard'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}

function UmsatzLineChart({ months }: { months: UmsatzMonat[] }) {
  const safeMonths = Array.isArray(months) ? months : []
  const offenVals = safeMonths.map((m) => Number(m?.offen) || 0)
  const doneVals = safeMonths.map((m) => Number(m?.abgeschlossen) || 0)
  const max = Math.max(1, ...offenVals, ...doneVals)
  const total = offenVals.reduce((s, n) => s + n, 0) + doneVals.reduce((s, n) => s + n, 0)

  const W = 360
  const H = 148
  const padL = 6
  const padR = 6
  const padT = 10
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = safeMonths.length

  function xAt(i: number) {
    if (n <= 1) return padL + innerW / 2
    return padL + (i / (n - 1)) * innerW
  }
  function yAt(v: number) {
    return padT + innerH - (v / max) * innerH
  }
  function linePath(vals: number[]) {
    if (!vals.length) return ''
    return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ')
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
          <div className="text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Netto · Auftragssummen · letzte 6 Monate
          </div>
        </div>
        <div className="w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-40 w-full"
            role="img"
            aria-label="Umsatzverlauf Liniendiagramm"
          >
            {/* Hilfslinien */}
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
            <path
              d={linePath(offenVals)}
              fill="none"
              stroke="var(--border-2, #c5c9ce)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={linePath(doneVals)}
              fill="none"
              stroke="var(--green)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {safeMonths.map((m, i) => (
              <g key={m.key}>
                <circle
                  cx={xAt(i)}
                  cy={yAt(offenVals[i]!)}
                  r={3}
                  fill="var(--card, #fff)"
                  stroke="var(--border-2, #c5c9ce)"
                  strokeWidth={1.5}
                >
                  <title>{`${m.label} Offen: ${formatEurBetrag(offenVals[i]!)}`}</title>
                </circle>
                <circle
                  cx={xAt(i)}
                  cy={yAt(doneVals[i]!)}
                  r={3}
                  fill="var(--card, #fff)"
                  stroke="var(--green)"
                  strokeWidth={1.5}
                >
                  <title>{`${m.label} Abgeschlossen: ${formatEurBetrag(doneVals[i]!)}`}</title>
                </circle>
                <text
                  x={xAt(i)}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-[var(--text-3)]"
                  style={{ fontSize: 11 }}
                >
                  {m.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="mt-1 flex items-center gap-4 text-[length:var(--fs-meta)] text-[var(--text-3)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: 'var(--green)' }} />
            Abgeschlossen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ background: 'var(--border-2, #c5c9ce)' }}
            />
            Offen
          </span>
        </div>
      </div>
    </div>
  )
}

function VertriebsFunnel({
  stufen,
  conversionGesamt,
  dropoffs,
}: {
  stufen: FunnelStufe[]
  conversionGesamt: number
  dropoffs: { after: string; lost: number; rate: number }[]
}) {
  const isMobile = useIsMobile()
  const safeStufen = Array.isArray(stufen) ? stufen : []
  const safeDropoffs = Array.isArray(dropoffs) ? dropoffs : []
  const maxCount = Math.max(1, ...safeStufen.map((s) => Number(s.count) || 0), 1)
  const worst = safeDropoffs.reduce(
    (best, d) => (d.rate > (best?.rate ?? -1) ? d : best),
    null as (typeof safeDropoffs)[0] | null
  )

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
        {safeStufen.map((s, i) => {
          const width = Math.max(28, Math.round((s.count / maxCount) * 100))
          const drop = safeDropoffs.find((d) => d.after === s.key)
          const showDrop = drop && drop.lost > 0 && i < safeStufen.length - 1
          const isWorst = worst && drop && worst.after === drop.after && drop.rate === worst.rate
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
              {showDrop ? (
                <div
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[length:var(--fs-meta)] font-medium',
                    isMobile && 'vfunnel-drop',
                    isWorst
                      ? 'bg-red-50 text-red-700'
                      : 'bg-[var(--bg-2)] text-[var(--text-3)]'
                  )}
                >
                  ↓ −{drop.rate}% · {drop.lost} verloren
                  {isWorst ? ' · größter Absprung' : ''}
                </div>
              ) : null}
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
        <div className="text-right text-[length:var(--fs-meta)] text-[var(--text-3)]">
          Auftragsvolumen gesamt
          <div className="text-[length:var(--fs-title)] font-semibold tabular-nums text-[var(--text)]">
            {formatEurBetrag(gesamt)}
          </div>
        </div>
      </div>
      <div className="card-b">
        <p className="mb-3 text-[length:var(--fs-meta)] text-[var(--text-3)]">
          Nur abgeschlossene Vorgänge · Netto aus Angebotspositionen
        </p>
        {(zeilen ?? []).length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-[var(--text-3)]">
            Noch keine abgeschlossenen Vorgänge mit Gewerken.
          </p>
        ) : (
          <div className="space-y-3">
            {(zeilen ?? []).map((z, i) => (
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
      <div className="card-b" style={{ paddingTop: 0 }}>
        {mode === 'handwerker' ? (
          <p className="mb-2 pt-3 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Sortiert nach Einkaufspreis (Zuweisung) · Umsatz = Auftragssumme Netto
          </p>
        ) : (
          <p className="mb-2 pt-3 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Sortiert nach Auftragssumme Netto · Vorgänge einzeln (Anfrage / Angebot / Auftrag)
          </p>
        )}
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-[var(--text-3)]">Keine Daten im Zeitraum.</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="list-row head"
              style={{
                gridTemplateColumns: '32px minmax(140px, 1.4fr) 72px minmax(100px, 1fr)',
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
                  gridTemplateColumns: '32px minmax(140px, 1.4fr) 72px minmax(100px, 1fr)',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div className="text-[length:var(--fs-meta)] tabular-nums text-[var(--text-3)]">{i + 1}</div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[length:var(--fs-meta)] font-semibold text-white"
                    style={{ background: gewerkColor(i) }}
                  >
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[length:var(--fs-text)] font-medium">{r.name}</div>
                    <div className="truncate text-[length:var(--fs-meta)] text-[var(--text-3)]">{r.sub}</div>
                  </div>
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
    dropoffs: { after: string; lost: number; rate: number }[]
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
          {isMobile ? (
            <span className="dash-sec__scroll-hint" aria-hidden>
              <MockIcon ctx="empty" n="arrows-exchange" size={14} />
            </span>
          ) : null}
        </div>
        <div className="dash-zahlen">
          <DashboardLazyMount minHeight={isMobile ? 200 : 260}>
            <UmsatzLineChart months={umsatzMonate} />
          </DashboardLazyMount>
          <DashboardLazyMount minHeight={isMobile ? 200 : 260}>
            <VertriebsFunnel
              stufen={funnel.stufen}
              conversionGesamt={funnel.conversionGesamt}
              dropoffs={funnel.dropoffs}
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

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  gewerkColor,
  type DashboardZeitraum,
  type FunnelStufe,
  type GewerkUmsatzZeile,
  type RankingZeile,
  type UmsatzMonat,
} from '@/lib/dashboard/dashboard-analytics'
import { cn } from '@/lib/utils'

export type DashboardKpi = {
  icon: string
  label: string
  value: number
  href: string
}

const ZEITRAUM_OPTIONS: { id: DashboardZeitraum; label: string }[] = [
  { id: '30d', label: '30 Tage' },
  { id: '90d', label: '90 Tage' },
  { id: 'year', label: 'Dieses Jahr' },
  { id: 'all', label: 'Gesamt' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}

function UmsatzBarChart({ months }: { months: UmsatzMonat[] }) {
  const safeMonths = Array.isArray(months) ? months : []
  const totals = safeMonths.map((m) => (Number(m?.offen) || 0) + (Number(m?.abgeschlossen) || 0))
  const max = totals.length ? Math.max(1, ...totals) : 1
  const total = totals.reduce((s, n) => s + n, 0)

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="activity" size={16} />
          Umsatzverlauf
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[var(--text-3)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--green)' }} />
            Abgeschlossen
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--border)]" />
            Offen
          </span>
        </div>
      </div>
      <div className="card-b">
        <div className="mb-4">
          <div className="text-[22px] font-semibold tracking-tight tabular-nums">
            {formatEurBetrag(total)}
          </div>
          <div className="text-[12.5px] text-[var(--text-3)]">Netto · Auftragssummen · letzte 12 Monate</div>
        </div>
        <div className="flex h-40 items-end gap-1.5 sm:gap-2">
          {safeMonths.map((m) => {
            const offen = Number(m?.offen) || 0
            const abgeschlossen = Number(m?.abgeschlossen) || 0
            const sum = offen + abgeschlossen
            const h = Math.max(sum > 0 ? 8 : 2, Math.round((sum / max) * 100))
            const doneH = sum > 0 ? Math.round((abgeschlossen / sum) * h) : 0
            const openH = h - doneH
            return (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className="flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t-md"
                  style={{ height: h }}
                  title={`${m.label}: ${formatEurBetrag(sum)}`}
                >
                  {openH > 0 ? (
                    <div style={{ height: openH, background: 'var(--border-2, #e5e7eb)' }} />
                  ) : null}
                  {doneH > 0 ? (
                    <div style={{ height: doneH, background: 'var(--green)' }} />
                  ) : null}
                </div>
                <span className="text-[10px] text-[var(--text-3)]">{m.label}</span>
              </div>
            )
          })}
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
        <div className="text-[13px] text-[var(--text-2)]">
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
              <div
                className="relative flex items-center justify-between rounded-lg px-3 py-2.5 text-white"
                style={{
                  width: `${width}%`,
                  minWidth: '40%',
                  background: s.color,
                }}
              >
                <span className="text-[13px] font-medium">{s.label}</span>
                <span className="text-[13px] font-semibold tabular-nums">
                  {s.count} <span className="font-normal opacity-80">· {s.rate}%</span>
                </span>
              </div>
              {showDrop ? (
                <div
                  className={cn(
                    'mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium',
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
        <div className="text-right text-[12.5px] text-[var(--text-3)]">
          Auftragsvolumen gesamt
          <div className="text-[15px] font-semibold tabular-nums text-[var(--text)]">
            {formatEurBetrag(gesamt)}
          </div>
        </div>
      </div>
      <div className="card-b">
        <p className="mb-3 text-[12px] text-[var(--text-3)]">
          Nur abgeschlossene Vorgänge · Netto aus Angebotspositionen
        </p>
        {(zeilen ?? []).length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--text-3)]">
            Noch keine abgeschlossenen Vorgänge mit Gewerken.
          </p>
        ) : (
          <div className="space-y-3">
            {(zeilen ?? []).map((z, i) => (
              <div key={z.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium">{z.name}</span>
                  <span className="text-[12.5px] tabular-nums text-[var(--text-2)]">
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

function TopRankingCard({
  handwerker,
  kunden,
}: {
  handwerker: RankingZeile[]
  kunden: RankingZeile[]
}) {
  const [mode, setMode] = useState<'handwerker' | 'kunden'>('handwerker')
  const rows = mode === 'handwerker' ? (handwerker ?? []) : (kunden ?? [])
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
          <p className="mb-2 pt-3 text-[12px] text-[var(--text-3)]">
            Sortiert nach Einkaufspreis (Zuweisung) · Umsatz = Auftragssumme Netto
          </p>
        ) : (
          <p className="mb-2 pt-3 text-[12px] text-[var(--text-3)]">
            Sortiert nach Auftragssumme Netto · Vorgänge einzeln (Anfrage / Angebot / Auftrag)
          </p>
        )}
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--text-3)]">Keine Daten im Zeitraum.</p>
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
                <div className="text-[12.5px] tabular-nums text-[var(--text-3)]">{i + 1}</div>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: gewerkColor(i) }}
                  >
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{r.name}</div>
                    <div className="truncate text-[11.5px] text-[var(--text-3)]">{r.sub}</div>
                  </div>
                </div>
                <div className="text-[13px] tabular-nums">{r.vorgaenge}</div>
                <div>
                  <div className="text-[13px] font-medium tabular-nums">
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
  zeitraum,
  kpis,
  umsatzMonate,
  funnel,
  gewerk,
  rankingHandwerker,
  rankingKunden,
}: {
  vorname: string
  zeitraum: DashboardZeitraum
  kpis: DashboardKpi[]
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

  function setZeitraum(z: DashboardZeitraum) {
    if (z === 'all') router.replace('/')
    else router.replace(`/?zeitraum=${encodeURIComponent(z)}`)
  }

  return (
    <div>
      <div
        className="mb-[22px] flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{dateStr}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 650,
              letterSpacing: '-0.02em',
              marginTop: 2,
            }}
          >
            {greeting}, {vorname}
          </div>
        </div>
        <div className="seg" role="group" aria-label="Zeitraum">
          {ZEITRAUM_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={zeitraum === o.id ? 'on' : undefined}
              onClick={() => setZeitraum(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        {(kpis ?? []).map((k) => (
          <button
            key={k.label}
            type="button"
            className="kpi-card"
            onClick={() => router.push(k.href)}
          >
            <div className="kpi-ico">
              <MockIcon ctx="default" n={k.icon} size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="kpi-val">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div
        className="mb-[22px] grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        <UmsatzBarChart months={umsatzMonate} />
        <VertriebsFunnel
          stufen={funnel.stufen}
          conversionGesamt={funnel.conversionGesamt}
          dropoffs={funnel.dropoffs}
        />
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        <GewerkUmsatzCard zeilen={gewerk.zeilen} gesamt={gewerk.gesamt} />
        <TopRankingCard handwerker={rankingHandwerker} kunden={rankingKunden} />
      </div>
    </div>
  )
}

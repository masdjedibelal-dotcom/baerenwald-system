'use client'

import { MockBtn, MockChip } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { DashboardLazyMount } from '@/components/dashboard/DashboardLazyMount'
import {
  buildDashboardZeitraumHref,
  DASHBOARD_ZEITRAUM_OPTIONS,
  type DashboardZeitraumFilter,
  type DashboardZeitraumPreset,
  type FunnelStufe,
  type GewerkUmsatzZeile,
  type RankingZeile,
  type UmsatzMonat,
  umsatzMonatGesamt,
} from '@/lib/dashboard/dashboard-analytics'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'
import { DashboardMarketingCard } from '@/components/dashboard/DashboardMarketingCard'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatWochentagDatumLang } from '@/lib/utils'
import { formatEuro } from '@/lib/format/geld-datum'
import { DateInput } from '@/components/ui/DateInput'
import { C } from '@/lib/tokens/colors'

export type DashboardKpi = {
  icon: string
  label: string
  value: number
  href: string
}


const ZEITRAUM_PRESETS = DASHBOARD_ZEITRAUM_OPTIONS.filter((o) => o.value !== 'benutzerdefiniert')

function DashboardZeitraumChips({ filter }: { filter: DashboardZeitraumFilter }) {
  const router = useRouter()
  const [customMode, setCustomMode] = useState(filter.preset === 'benutzerdefiniert')
  const [draftVon, setDraftVon] = useState(filter.von)
  const [draftBis, setDraftBis] = useState(filter.bis)

  useEffect(() => {
    setDraftVon(filter.von)
    setDraftBis(filter.bis)
    setCustomMode(filter.preset === 'benutzerdefiniert')
  }, [filter.von, filter.bis, filter.preset])

  function navigate(next: DashboardZeitraumFilter) {
    router.replace(buildDashboardZeitraumHref(next))
  }

  function selectPreset(preset: DashboardZeitraumPreset) {
    setCustomMode(false)
    navigate({ preset, von: '', bis: '' })
  }

  function applyCustomRange() {
    if (!draftVon.trim() || !draftBis.trim()) return
    navigate({ preset: 'benutzerdefiniert', von: draftVon, bis: draftBis })
  }

  return (
    <div className="dash-zeitraum-chips">
      <div className="chiprow" role="group" aria-label="Zeitraum">
        {ZEITRAUM_PRESETS.map((o) => (
          <MockChip
            key={o.value}
            active={!customMode && filter.preset === o.value}
            onClick={() => selectPreset(o.value)}
          >
            {o.label}
          </MockChip>
        ))}
        <MockChip active={customMode} onClick={() => setCustomMode(true)}>
          Individuell
        </MockChip>
      </div>
      {customMode ? (
        <div className="dash-zeitraum-chips__custom">
          <DateInput
            size="sm"
            value={draftVon}
            onChange={(e) => setDraftVon(e.target.value)}
            aria-label="Von"
          />
          <DateInput
            size="sm"
            value={draftBis}
            min={draftVon || undefined}
            onChange={(e) => setDraftBis(e.target.value)}
            aria-label="Bis"
          />
          <MockBtn
            kind="primary"
            sm
            type="button"
            disabled={!draftVon.trim() || !draftBis.trim()}
            onClick={applyCustomRange}
          >
            Anwenden
          </MockBtn>
        </div>
      ) : null}
    </div>
  )
}

/** Kompakt für enge Monatsspalten — ganze Euro, geschütztes Leerzeichen vor €. */
function UmsatzBarChart({ months }: { months: UmsatzMonat[] }) {
  const safeMonths = Array.isArray(months) ? months : []
  const totals = safeMonths.map((m) => umsatzMonatGesamt(m))
  const max = Math.max(1, ...totals)
  const total = totals.reduce((s, n) => s + n, 0)

  return (
    <MockCard title="Umsatzverlauf" icon="activity">
      <div className="mb-3">
        <div className="text-[length:var(--fs-head)] font-semibold tracking-tight tabular-nums">
          {formatEurBetrag(total)}
        </div>
      </div>
      {/* HTML statt SVG: füllt die Kartenbreite, Beschriftung in Textgröße der App */}
      <div className="dash-umsatz" role="img" aria-label="Umsatzverlauf Balkendiagramm">
        {safeMonths.map((m) => {
          const gesamt = umsatzMonatGesamt(m)
          const pct = gesamt > 0 ? Math.max((gesamt / max) * 100, 1) : 0
          return (
            <div key={m.key} className="dash-umsatz__monat" title={`${m.label}: ${formatEurBetrag(gesamt)}`}>
              <div className="dash-umsatz__saeule">
                {pct > 0 ? <div className="dash-umsatz__balken" style={{ height: `${pct}%` }} /> : null}
              </div>
              <span className="dash-umsatz__label">{m.label}</span>
            </div>
          )
        })}
      </div>
    </MockCard>
  )
}

function VertriebsFunnel({
  stufen,
  conversionGesamt,
}: {
  stufen: FunnelStufe[]
  conversionGesamt: number
}) {
  const safeStufen = Array.isArray(stufen) ? stufen : []
  const maxCount = Math.max(1, ...safeStufen.map((s) => Number(s.count) || 0), 1)

  return (
    <MockCard
      title="Vertriebs-Funnel"
      icon="filter"
      actions={
        <div className="text-[length:var(--fs-text)] text-[var(--text-2)]">
          Gesamt-Conversion{' '}
          <b className="tabular-nums text-[var(--text)]">{conversionGesamt}%</b>
        </div>
      }
      bodyClassName="space-y-2"
    >
        {/* Design 01.10.2026: eine ruhige Zeile je Stufe — Bezeichnung · Balken · Zahl (eine Farbe) */}
        {safeStufen.map((s) => {
          const width = Math.max(4, Math.round((s.count / maxCount) * 100))
          return (
            <div key={s.key} className="dash-funnel-row">
              <span className="dash-funnel-row__label">{s.label}</span>
              <span className="dash-funnel-row__track">
                <span className="dash-funnel-row__fill" style={{ width: `${width}%` }} />
              </span>
              <span className="dash-funnel-row__num tabular-nums">
                {s.count} <span className="dash-funnel-row__pct">{s.rate}%</span>
              </span>
            </div>
          )
        })}
    </MockCard>
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
    <MockCard
      title="Umsatz nach Gewerk"
      icon="clock"
      actions={
        <div className="text-[length:var(--fs-title)] font-semibold tabular-nums text-[var(--text)]">
          {formatEurBetrag(gesamt)}
        </div>
      }
    >
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
                <div className="h-2 overflow-hidden rounded-pill bg-[var(--bg-soft)]">
                  <div
                    className="h-full rounded-pill transition-[width]"
                    style={{
                      width: `${Math.max(z.anteil, z.netto > 0 ? 2 : 0)}%`,
                      background: C.green,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
    </MockCard>
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
    <MockCard
      title="Top-Ranking"
      icon="trophy"
      actions={
        <div className="seg" role="group" aria-label="Ranking-Modus">
          <MockBtn className={mode === 'handwerker' ? 'on' : undefined} type="button" onClick={() => setMode('handwerker')}>
            Partner
          </MockBtn>
          <MockBtn className={mode === 'kunden' ? 'on' : undefined} type="button" onClick={() => setMode('kunden')}>
            Kunden
          </MockBtn>
        </div>
      }
    >
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
                    <span className="whitespace-nowrap font-medium tabular-nums text-[var(--text)]">
                      {formatEuro(r.umsatz, { rounded: true, decimals: 0 })}
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
                gridTemplateColumns: '2rem minmax(8.75rem, 1.5fr) 4.5rem minmax(5.5rem, 0.85fr)',
                gap: 8,
              }}
            >
              <div>#</div>
              <div>{mode === 'handwerker' ? 'Partner' : 'Kunde'}</div>
              <div>Vorgänge</div>
              <div>Umsatz</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="list-row"
                style={{
                  gridTemplateColumns: '2rem minmax(8.75rem, 1.5fr) 4.5rem minmax(5.5rem, 0.85fr)',
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
                  <div className="whitespace-nowrap text-[length:var(--fs-meta)] font-medium tabular-nums">
                    {formatEuro(r.umsatz, { rounded: true, decimals: 0 })}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-[var(--bg-2)]">
                    <div
                      className="h-full rounded-pill"
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
    </MockCard>
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

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  }, [])

  const dateStr = useMemo(
    () => formatWochentagDatumLang(new Date(), { withYear: false }),
    []
  )

  /* Mobil: Dokument-Scroll — nach Navigation von langen Listen (z. B. Vorgänge) zurücksetzen */
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.querySelector<HTMLElement>('main.page')?.scrollTo(0, 0)
  }, [])

  return (
    <div className="dashboard-page min-w-0">
      <header className="dash-hero mb-[22px] flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[length:var(--fs-text)] text-[var(--text-3)]">{dateStr}</div>
          <div className="mt-0.5 text-[length:var(--fs-head)] font-semibold tracking-tight">
            {greeting}, {vorname}
          </div>
        </div>
        <div className="dash-hero__filters flex min-w-0 flex-wrap items-center justify-end gap-2">
          <DashboardZeitraumChips filter={zeitraumFilter} />
        </div>
      </header>

      <section className="dash-sec" aria-label="Heute">
        <div className="kpi-grid">
          {(kpis ?? []).map((k) => (
            <MockBtn className="kpi-tile" key={k.label} type="button" onClick={() => router.push(k.href)}>
              <div className="kpi-ico">
                <MockIcon ctx="default" n={k.icon} size={isMobile ? 15 : 19} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="kpi-val">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </MockBtn>
          ))}
        </div>
      </section>

      <section className="dash-sec" aria-label="Marketing">
        {/* P16: Marketing-Kacheln entfernt (Anbindung defekt, KI-Analytics auf Streichliste) */}
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

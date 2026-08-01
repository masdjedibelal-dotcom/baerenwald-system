'use client'

import { useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'
import { useIsMobile } from '@/hooks/useIsMobile'

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('de-DE').format(Math.round(n))
}

/** Kompakte Mock-KPI-Kachel: Label oben, Wert + Detail in einer Zeile. */
function CompactKpi({
  label,
  value,
  detail,
  detailTone = 'muted',
  muted,
  onErrorClick,
}: {
  label: string
  value: string
  detail: string
  detailTone?: 'muted' | 'positive'
  muted?: boolean
  onErrorClick?: () => void
}) {
  return (
    <div className="mkt-kpi">
      <div className="mkt-kpi-label">{label}</div>
      <div className="mkt-kpi-row">
        <span className={`mkt-kpi-val${muted ? ' muted' : ''}`}>{value}</span>
        {onErrorClick ? (
          <button type="button" className="mkt-kpi-detail link" onClick={onErrorClick}>
            {detail}
          </button>
        ) : (
          <span className={`mkt-kpi-detail${detailTone === 'positive' ? ' positive' : ''}`}>
            {detail}
          </span>
        )}
      </div>
    </div>
  )
}

export function DashboardMarketingCard({ data }: { data: DashboardMarketingSnapshot }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<'marketing' | 'sichtbarkeit'>('marketing')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [funnelOpen, setFunnelOpen] = useState(false)

  const maxFunnel = useMemo(() => {
    const counts = data.funnelStages.map((s) => s.count)
    return Math.max(1, ...counts, data.rechnerStart ?? 0)
  }, [data.funnelStages, data.rechnerStart])

  const worstDropKey = useMemo(() => {
    let best: (typeof data.funnelStages)[number] | null = null
    for (const s of data.funnelStages) {
      if (s.dropoffPct == null || s.dropoffLost == null || s.dropoffLost <= 0) continue
      if (!best || s.dropoffPct > (best.dropoffPct ?? -1)) best = s
    }
    return best?.key ?? null
  }, [data.funnelStages])

  const funnelBody =
    data.funnelOk && data.funnelStages.length > 0 ? (
      <div className="mkt-funnel-list">
        {data.funnelStages.map((s) => {
          const hasDrop =
            s.dropoffPct != null && s.dropoffLost != null && s.dropoffLost > 0
          const isWorst = worstDropKey === s.key
          const detail = hasDrop
            ? `↓ −${s.dropoffPct}% · −${formatNum(s.dropoffLost)}${
                isWorst ? ' · größter Absprung' : ''
              }`
            : s.key === 'start'
              ? 'Start'
              : s.key === 'lead'
                ? 'Conversion'
                : null
          return (
            <div key={s.key} className="mkt-funnel-row">
              <div className="mkt-funnel-left">
                <span className="mkt-funnel-title">{s.label}</span>
                {detail ? (
                  <span
                    className={
                      isWorst ? 'mkt-funnel-detail worst' : 'mkt-funnel-detail'
                    }
                  >
                    {detail}
                  </span>
                ) : null}
              </div>
              <div className="mkt-funnel-bar">
                <div
                  className="mkt-funnel-bar-fill"
                  style={{
                    width: `${Math.round((s.count / maxFunnel) * 100)}%`,
                  }}
                />
              </div>
              <div className="mkt-funnel-nums">
                <span className="mkt-funnel-count">{formatNum(s.count)}</span>
                <span className="mkt-funnel-pct">
                  {s.pctOfStart != null ? `${s.pctOfStart}%` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="mkt-funnel-empty">
        {data.funnelOk
          ? 'Noch keine Rechner-Events im Zeitraum.'
          : 'Funnel nicht verfügbar.'}
        {!data.funnelOk && data.funnelError ? (
          <>
            {' '}
            <button
              type="button"
              className="underline decoration-dotted"
              onClick={() => setErrorDetail(data.funnelError)}
            >
              Details
            </button>
          </>
        ) : null}
      </div>
    )

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="trending-up" size={16} />
          Marketing &amp; Sichtbarkeit
        </div>
        <div className="seg" role="group" aria-label="Marketing-Bereich">
          <button
            type="button"
            className={tab === 'marketing' ? 'on' : undefined}
            onClick={() => setTab('marketing')}
          >
            Marketing
          </button>
          <button
            type="button"
            className={tab === 'sichtbarkeit' ? 'on' : undefined}
            onClick={() => setTab('sichtbarkeit')}
          >
            Sichtbarkeit
          </button>
        </div>
      </div>

      <div className="card-b" style={{ paddingTop: 4 }}>
        {tab === 'marketing' ? (
          <>
            <div className="mkt-kpi-grid mkt-kpi-grid--3">
              <CompactKpi
                label="Website-Besuche"
                value={data.pageviewsOk ? formatNum(data.pageviews) : '—'}
                detail={data.pageviewsOk ? 'Website' : 'Fehler'}
                muted={!data.pageviewsOk || data.pageviews == null}
                onErrorClick={
                  !data.pageviewsOk && data.pageviewsError
                    ? () => setErrorDetail(data.pageviewsError)
                    : undefined
                }
              />
              <CompactKpi
                label="Rechner gestartet"
                value={data.funnelOk ? formatNum(data.rechnerStart) : '—'}
                detail={data.funnelOk ? 'PostHog' : 'Fehler'}
                muted={!data.funnelOk || data.rechnerStart == null}
                onErrorClick={
                  !data.funnelOk && data.funnelError
                    ? () => setErrorDetail(data.funnelError)
                    : undefined
                }
              />
              <CompactKpi
                label="Anfrage abgeschickt"
                value={data.funnelOk ? formatNum(data.rechnerLead) : '—'}
                detail={
                  data.funnelOk &&
                  data.rechnerStart &&
                  data.rechnerStart > 0 &&
                  data.rechnerLead != null
                    ? `${Math.round((data.rechnerLead / data.rechnerStart) * 1000) / 10}% vom Start`
                    : data.funnelOk
                      ? 'PostHog'
                      : 'Fehler'
                }
                muted={!data.funnelOk || data.rechnerLead == null}
                onErrorClick={
                  !data.funnelOk && data.funnelError
                    ? () => setErrorDetail(data.funnelError)
                    : undefined
                }
              />
            </div>

            <div className={`mkt-funnel-block${isMobile ? ' mkt-funnel-block--acc' : ''}`}>
              {isMobile ? (
                <button
                  type="button"
                  className="mkt-funnel-acc-trigger"
                  aria-expanded={funnelOpen}
                  onClick={() => setFunnelOpen((o) => !o)}
                >
                  <span className="mkt-funnel-h">Rechner-Funnel</span>
                  <MockIcon
                    ctx="empty"
                    n="chevron-down"
                    size={16}
                    className={funnelOpen ? 'mkt-funnel-acc-ico open' : 'mkt-funnel-acc-ico'}
                  />
                </button>
              ) : (
                <p className="mkt-funnel-h">Rechner-Funnel</p>
              )}
              {(!isMobile || funnelOpen) ? (
                <>
                  {funnelBody}
                  {data.funnelOk && data.funnelError ? (
                    <p className="mkt-funnel-hint">Hinweis: {data.funnelError}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="mkt-kpi-grid mkt-kpi-grid--2">
              <CompactKpi
                label="Google-Klicks"
                value={data.gscOk ? formatNum(data.gscClicks) : '—'}
                detail={data.gscOk ? 'Search Console' : 'Fehler'}
                muted={!data.gscOk || data.gscClicks == null}
                onErrorClick={
                  !data.gscOk && data.gscError ? () => setErrorDetail(data.gscError) : undefined
                }
              />
              <CompactKpi
                label="Impressionen"
                value={data.gscOk ? formatNum(data.gscImpressions) : '—'}
                detail={data.gscOk ? 'Search Console' : 'Fehler'}
                muted={!data.gscOk || data.gscImpressions == null}
                onErrorClick={
                  !data.gscOk && data.gscError ? () => setErrorDetail(data.gscError) : undefined
                }
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-[0.04em] text-[var(--text-3)]">
                Meistgesucht (Google)
              </p>
              {data.topQueries.length > 0 ? (
                <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                  <table className="w-full text-left text-[length:var(--fs-meta)]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[length:var(--fs-meta)] uppercase tracking-[0.03em] text-[var(--text-3)]">
                        <th className="px-3 py-2 font-semibold">Suchbegriff</th>
                        <th className="px-3 py-2 text-right font-semibold">Klicks</th>
                        <th className="px-3 py-2 text-right font-semibold">Impr.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topQueries.map((q) => (
                        <tr key={q.query} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-3 py-2 text-[var(--text)]">{q.query}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatNum(q.clicks)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--text-3)]">
                            {formatNum(q.impressions)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-[10px] border border-[var(--border)] px-3 py-6 text-center text-[length:var(--fs-meta)] text-[var(--text-3)]">
                  —
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <MockModal
        open={errorDetail != null}
        onClose={() => setErrorDetail(null)}
        icon="alert-triangle"
        title="Fehlerdetails"
        footer={
          <MockBtn kind="ghost" onClick={() => setErrorDetail(null)}>
            Schließen
          </MockBtn>
        }
      >
        <p className="break-words text-[length:var(--fs-text)] text-[var(--text)]">{errorDetail}</p>
      </MockModal>
    </div>
  )
}

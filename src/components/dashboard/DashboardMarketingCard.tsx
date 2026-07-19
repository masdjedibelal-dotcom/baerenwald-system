'use client'

import { useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('de-DE').format(Math.round(n))
}

function MetricTile({
  label,
  value,
  sub,
  icon,
  muted,
  onErrorClick,
}: {
  label: string
  value: string
  sub: string
  icon: string
  muted?: boolean
  onErrorClick?: () => void
}) {
  return (
    <div className="metric">
      <div className="label">
        <MockIcon ctx="default" n={icon} size={14} />
        {label}
      </div>
      <div className={`value${muted ? '' : ' green'}`}>{value}</div>
      <div className="delta" style={{ color: 'var(--text-3)' }}>
        {onErrorClick ? (
          <button
            type="button"
            className="text-[inherit] underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
            onClick={onErrorClick}
          >
            {sub}
          </button>
        ) : (
          sub
        )}
      </div>
      <div className="icon-bg" aria-hidden>
        <MockIcon ctx="default" n={icon} size={64} />
      </div>
    </div>
  )
}

const NACHFRAGE_TYP_LABEL: Record<string, string> = {
  gewerk: 'Gewerk',
  leistung: 'Leistung',
  ort: 'Ort',
}

export function DashboardMarketingCard({ data }: { data: DashboardMarketingSnapshot }) {
  const [tab, setTab] = useState<'marketing' | 'sichtbarkeit'>('marketing')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [nachfrageFilter, setNachfrageFilter] = useState<'alle' | 'gewerk' | 'leistung' | 'ort'>(
    'alle'
  )

  const maxFunnel = useMemo(() => {
    const counts = data.funnelStages.map((s) => s.count)
    return Math.max(1, ...counts, data.rechnerStart ?? 0)
  }, [data.funnelStages, data.rechnerStart])

  const nachfrageRows = useMemo(() => {
    const rows = data.nachfrage ?? []
    if (nachfrageFilter === 'alle') return rows
    return rows.filter((r) => r.typ === nachfrageFilter)
  }, [data.nachfrage, nachfrageFilter])

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
            <div className="metrics" style={{ marginBottom: 0 }}>
              <MetricTile
                label="Website-Besuche"
                value={data.pageviewsOk ? formatNum(data.pageviews) : '—'}
                sub={data.pageviewsOk ? 'Website' : 'Fehler'}
                icon="eye"
                muted={!data.pageviewsOk || data.pageviews == null}
                onErrorClick={
                  !data.pageviewsOk && data.pageviewsError
                    ? () => setErrorDetail(data.pageviewsError)
                    : undefined
                }
              />
              <MetricTile
                label="Rechner gestartet"
                value={data.funnelOk ? formatNum(data.rechnerStart) : '—'}
                sub={data.funnelOk ? 'PostHog' : 'Fehler'}
                icon="calculator"
                muted={!data.funnelOk || data.rechnerStart == null}
                onErrorClick={
                  !data.funnelOk && data.funnelError
                    ? () => setErrorDetail(data.funnelError)
                    : undefined
                }
              />
              <MetricTile
                label="Anfrage abgeschickt"
                value={data.funnelOk ? formatNum(data.rechnerLead) : '—'}
                sub={
                  data.funnelOk && data.rechnerStart && data.rechnerStart > 0 && data.rechnerLead != null
                    ? `${Math.round((data.rechnerLead / data.rechnerStart) * 1000) / 10}% vom Start`
                    : data.funnelOk
                      ? 'PostHog'
                      : 'Fehler'
                }
                icon="send"
                muted={!data.funnelOk || data.rechnerLead == null}
                onErrorClick={
                  !data.funnelOk && data.funnelError
                    ? () => setErrorDetail(data.funnelError)
                    : undefined
                }
              />
              <MetricTile
                label="E-Mail-Zustellrate"
                value={
                  data.resendOk && data.deliveryRatePct != null
                    ? `${formatNum(data.deliveryRatePct)}%`
                    : '—'
                }
                sub={data.resendOk ? 'E-Mail' : 'Fehler'}
                icon="mail"
                muted={!data.resendOk || data.deliveryRatePct == null}
                onErrorClick={
                  !data.resendOk && data.resendError
                    ? () => setErrorDetail(data.resendError)
                    : undefined
                }
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-3)]">
                Rechner-Funnel
              </p>
              {data.funnelOk && data.funnelStages.length > 0 ? (
                <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                  <div className="flex min-w-[480px] flex-col gap-2 p-3">
                    {data.funnelStages.map((s) => (
                      <div key={s.key} className="grid grid-cols-[minmax(120px,1.2fr)_72px_minmax(80px,1fr)_48px] items-center gap-2">
                        <div className="truncate text-[12.5px] font-medium text-[var(--text)]">
                          {s.label}
                        </div>
                        <div className="text-right text-[12.5px] tabular-nums text-[var(--text)]">
                          {formatNum(s.count)}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-2)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((s.count / maxFunnel) * 100)}%`,
                              background: 'var(--green)',
                            }}
                          />
                        </div>
                        <div className="text-right text-[11.5px] tabular-nums text-[var(--text-3)]">
                          {s.pctOfStart != null ? `${s.pctOfStart}%` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.funnelError ? (
                    <p className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-3)]">
                      Hinweis: {data.funnelError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[10px] border border-[var(--border)] px-3 py-6 text-center text-[12.5px] text-[var(--text-3)]">
                  {data.funnelOk ? 'Noch keine Rechner-Events im Zeitraum.' : 'Funnel nicht verfügbar.'}
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
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-3)]">
                  Meist angefragt
                </p>
                <div className="seg" role="group" aria-label="Nachfrage-Filter">
                  {(
                    [
                      ['alle', 'Alle'],
                      ['gewerk', 'Gewerke'],
                      ['leistung', 'Leistungen'],
                      ['ort', 'Orte'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={nachfrageFilter === id ? 'on' : undefined}
                      onClick={() => setNachfrageFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {nachfrageRows.length > 0 ? (
                <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                  <table className="w-full text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-[0.03em] text-[var(--text-3)]">
                        <th className="px-3 py-2 font-semibold">Typ</th>
                        <th className="px-3 py-2 font-semibold">Bezeichnung</th>
                        <th className="px-3 py-2 text-right font-semibold">Anfragen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nachfrageRows.map((r) => (
                        <tr
                          key={`${r.typ}-${r.label}`}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="px-3 py-2 text-[var(--text-3)]">
                            {NACHFRAGE_TYP_LABEL[r.typ] ?? r.typ}
                          </td>
                          <td className="px-3 py-2 text-[var(--text)]">{r.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatNum(r.count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-[10px] border border-[var(--border)] px-3 py-6 text-center text-[12.5px] text-[var(--text-3)]">
                  Noch keine Anfragen mit Gewerk / Ort im Zeitraum.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="metrics" style={{ marginBottom: 0 }}>
              <MetricTile
                label="Google-Klicks"
                value={data.gscOk ? formatNum(data.gscClicks) : '—'}
                sub={data.gscOk ? 'Search Console' : 'Fehler'}
                icon="brand-google"
                muted={!data.gscOk || data.gscClicks == null}
                onErrorClick={
                  !data.gscOk && data.gscError ? () => setErrorDetail(data.gscError) : undefined
                }
              />
              <MetricTile
                label="Impressionen"
                value={data.gscOk ? formatNum(data.gscImpressions) : '—'}
                sub={data.gscOk ? 'Search Console' : 'Fehler'}
                icon="list-search"
                muted={!data.gscOk || data.gscImpressions == null}
                onErrorClick={
                  !data.gscOk && data.gscError ? () => setErrorDetail(data.gscError) : undefined
                }
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-3)]">
                Meistgesucht (Google)
              </p>
              {data.topQueries.length > 0 ? (
                <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                  <table className="w-full text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-[0.03em] text-[var(--text-3)]">
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
                <div className="rounded-[10px] border border-[var(--border)] px-3 py-6 text-center text-[12.5px] text-[var(--text-3)]">
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
        <p className="break-words text-[13px] text-[var(--text)]">{errorDetail}</p>
      </MockModal>
    </div>
  )
}

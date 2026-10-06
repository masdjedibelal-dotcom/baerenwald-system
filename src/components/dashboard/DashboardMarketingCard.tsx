'use client'
import { MockBtn, MockTable } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

import { useMemo, useState } from 'react'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatNumber } from '@/lib/format/geld-datum'

function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatNumber(Math.round(n))
}

/** Kompakte Mock-KPI-Kachel: Label oben, Wert (+ optional Detail rechts). */
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
  detail?: string | null
  detailTone?: 'muted' | 'positive'
  muted?: boolean
  onErrorClick?: () => void
}) {
  const showDetail = Boolean(detail?.trim())
  return (
    <div className="mkt-kpi">
      <div className="mkt-kpi-label">{label}</div>
      <div className="mkt-kpi-row">
        <span className={`mkt-kpi-val${muted ? ' muted' : ''}`}>{value}</span>
        {showDetail ? (
          onErrorClick ? (
            <MockBtn className="mkt-kpi-detail link" type="button" onClick={onErrorClick}>
              {detail}
            </MockBtn>
          ) : (
            <span className={`mkt-kpi-detail${detailTone === 'positive' ? ' positive' : ''}`}>
              {detail}
            </span>
          )
        ) : null}
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

  const funnelBody =
    data.funnelOk && data.funnelStages.length > 0 ? (
      <div className="mkt-funnel-list">
        {data.funnelStages.map((s) => (
          <div key={s.key} className="mkt-funnel-row">
            <div className="mkt-funnel-left">
              <span className="mkt-funnel-title">{s.label}</span>
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
        ))}
      </div>
    ) : (
      <div className="mkt-funnel-empty">
        {data.funnelOk
          ? 'Noch keine Rechner-Events im Zeitraum.'
          : 'Funnel nicht verfügbar.'}
        {!data.funnelOk && data.funnelError ? (
          <>
            {' '}
            <MockBtn className="underline decoration-dotted" type="button" onClick={() => setErrorDetail(data.funnelError)}>
              Details
            </MockBtn>
          </>
        ) : null}
      </div>
    )

  return (
    <>
    <MockCard
      title={isMobile ? 'Marketing' : 'Marketing & Sichtbarkeit'}
      icon="trending-up"
      actions={
        <div className="seg" role="group" aria-label="Marketing-Bereich">
          <MockBtn className={tab === 'marketing' ? 'on' : undefined} type="button" onClick={() => setTab('marketing')}>
            Marketing
          </MockBtn>
          <MockBtn className={tab === 'sichtbarkeit' ? 'on' : undefined} type="button" onClick={() => setTab('sichtbarkeit')}>
            Sichtbarkeit
          </MockBtn>
        </div>
      }
      bodyClassName="pt-1"
    >
        {tab === 'marketing' ? (
          <>
            <div className="mkt-kpi-grid mkt-kpi-grid--3">
              <CompactKpi
                label="Website-Besuche"
                value={data.pageviewsOk ? formatNum(data.pageviews) : '—'}
                detail={!data.pageviewsOk ? 'Fehler' : null}
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
                detail={!data.funnelOk ? 'Fehler' : null}
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
                detail={!data.funnelOk ? 'Fehler' : null}
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
                <MockBtn className="mkt-funnel-acc-trigger" type="button" aria-expanded={funnelOpen} onClick={() => setFunnelOpen((o) => !o)}>
                  <span className="mkt-funnel-h">Rechner-Funnel</span>
                  <MockIcon
                    ctx="empty"
                    n="chevron-down"
                    size={16}
                    className={funnelOpen ? 'mkt-funnel-acc-ico open' : 'mkt-funnel-acc-ico'}
                  />
                </MockBtn>
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
                muted={!data.gscOk || data.gscClicks == null}
              />
              <CompactKpi
                label="Impressionen"
                value={data.gscOk ? formatNum(data.gscImpressions) : '—'}
                muted={!data.gscOk || data.gscImpressions == null}
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-[0.04em] text-[var(--text-3)]">
                Meistgesucht (Google)
              </p>
              {data.topQueries.length > 0 ? (
                <MockTable wrapClassName="overflow-x-auto rounded-[10px] border border-[var(--border)]" className="w-full text-left text-[length:var(--fs-meta)]">
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
                </MockTable>
              ) : (
                <div className="rounded-[10px] border border-[var(--border)] px-3 py-6 text-center text-[length:var(--fs-meta)] text-[var(--text-3)]">
                  —
                </div>
              )}
            </div>
          </>
        )}
    </MockCard>

      <EditorSheet
        open={errorDetail != null}
        onClose={() => setErrorDetail(null)}
        title="Fehlerdetails"
        secondary={{ label: 'Schließen', onClick: () => setErrorDetail(null), kind: 'ghost' }}
      >
        <p className="break-words text-[length:var(--fs-text)] text-[var(--text)]">{errorDetail}</p>
      </EditorSheet>
    </>
  )
}

'use client'

import { useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'

function formatNum(n: number | null): string {
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

export function DashboardMarketingCard({ data }: { data: DashboardMarketingSnapshot }) {
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="trending-up" size={16} />
          Marketing &amp; Sichtbarkeit
        </div>
      </div>
      <div className="card-b" style={{ paddingTop: 4 }}>
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

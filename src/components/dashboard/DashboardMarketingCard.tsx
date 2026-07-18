'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
}: {
  label: string
  value: string
  sub: string
  icon: string
  muted?: boolean
}) {
  return (
    <div className="metric">
      <div className="label">
        <MockIcon ctx="default" n={icon} size={14} />
        {label}
      </div>
      <div className={`value${muted ? '' : ' green'}`}>{value}</div>
      <div className="delta" style={{ color: 'var(--text-3)' }}>
        {sub}
      </div>
      <div className="icon-bg" aria-hidden>
        <MockIcon ctx="default" n={icon} size={64} />
      </div>
    </div>
  )
}

export function DashboardMarketingCard({ data }: { data: DashboardMarketingSnapshot }) {
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="trending-up" size={16} />
          Marketing &amp; Sichtbarkeit
        </div>
        <Link
          href="/ki-analytics"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--green)] hover:underline"
        >
          KI Hub
          <MockIcon ctx="default" n="chevron-right" size={14} />
        </Link>
      </div>
      <div className="card-b" style={{ paddingTop: 4 }}>
        <p className="mb-3 text-[12.5px] text-[var(--text-3)]">
          Live aus PostHog, Search Console und Resend
        </p>
        <div className="metrics" style={{ marginBottom: 0 }}>
          <MetricTile
            label="Pageviews"
            value={data.pageviewsOk ? formatNum(data.pageviews7d) : '—'}
            sub={data.pageviewsOk ? 'Website · 7 Tage' : (data.pageviewsError ?? 'PostHog')}
            icon="eye"
            muted={!data.pageviewsOk || data.pageviews7d == null}
          />
          <MetricTile
            label="Klicks"
            value={data.gscOk ? formatNum(data.gscClicks) : '—'}
            sub={data.gscOk ? 'Search Console · 28 Tage' : (data.gscError ?? 'GSC')}
            icon="brand-google"
            muted={!data.gscOk || data.gscClicks == null}
          />
          <MetricTile
            label="Impressionen"
            value={data.gscOk ? formatNum(data.gscImpressions) : '—'}
            sub={data.gscOk ? 'Search Console · 28 Tage' : (data.gscError ?? 'GSC')}
            icon="list-search"
            muted={!data.gscOk || data.gscImpressions == null}
          />
          <MetricTile
            label="Zustellrate"
            value={
              data.resendOk && data.deliveryRatePct != null
                ? `${formatNum(data.deliveryRatePct)}%`
                : '—'
            }
            sub={data.resendOk ? 'Resend · letzte 20 Mails' : (data.resendError ?? 'Resend')}
            icon="mail"
            muted={!data.resendOk || data.deliveryRatePct == null}
          />
        </div>
        {!data.gscOk ? (
          <p className="mt-3 text-[12px] text-[var(--text-3)]">
            Search Console verbinden unter{' '}
            <Link href="/api/ki-hub/gsc/oauth/start" className="font-medium text-[var(--green)] hover:underline">
              Google verbinden
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  )
}

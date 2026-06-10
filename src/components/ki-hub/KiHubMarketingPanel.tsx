'use client'

import type { KiHubLoadPayload } from '@/lib/ki-hub/types'

type Props = {
  data: KiHubLoadPayload | undefined
}

export function KiHubMarketingPanel({ data }: Props) {
  if (!data) return null

  const posthog = data.marketing.posthog
  const google = data.marketing.google
  const resend = data.marketing.resend

  const gscQueries = (google.data?.top_queries as Array<{
    query: string
    clicks: number
    impressions: number
  }>) ?? []

  return (
    <section className="rounded-xl border border-bw-border bg-bw-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-bw-text">Marketing &amp; Sichtbarkeit</h2>
      <p className="mt-1 text-xs text-muted">Live aus PostHog, Search Console und Resend</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-bw-border/70 bg-bw-bg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">PostHog (7 Tage)</p>
          {posthog.status === 'ok' ? (
            <>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-bw-text">
                {posthog.data?.pageviews_7d != null
                  ? String(posthog.data.pageviews_7d)
                  : '—'}
              </p>
              <p className="text-xs text-muted">Pageviews Website</p>
            </>
          ) : (
            <p className="mt-2 text-xs text-amber-800">{posthog.error ?? 'Nicht verbunden'}</p>
          )}
        </div>

        <div className="rounded-lg border border-bw-border/70 bg-bw-bg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Search Console (28 Tage)
          </p>
          {google.status === 'ok' ? (
            <>
              <div className="mt-2 flex gap-4">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-bw-text">
                    {String(google.data?.clicks ?? '—')}
                  </p>
                  <p className="text-xs text-muted">Klicks</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-bw-text">
                    {String(google.data?.impressions ?? '—')}
                  </p>
                  <p className="text-xs text-muted">Impressionen</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-amber-800">{google.error ?? 'Nicht verbunden'}</p>
              <a
                href="/api/ki-hub/gsc/oauth/start"
                className="inline-flex text-xs font-medium text-bw-link hover:underline"
              >
                Mit Google verbinden
              </a>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-bw-border/70 bg-bw-bg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resend</p>
          {resend.status === 'ok' ? (
            <>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-bw-text">
                {resend.data?.delivery_rate_pct != null
                  ? `${resend.data.delivery_rate_pct}%`
                  : '—'}
              </p>
              <p className="text-xs text-muted">Zustellrate (letzte 20 Mails)</p>
            </>
          ) : (
            <p className="mt-2 text-xs text-amber-800">{resend.error ?? 'Nicht verbunden'}</p>
          )}
        </div>
      </div>

      {google.status === 'ok' && gscQueries.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-bw-text">Top Suchanfragen (GSC)</p>
          <ul className="mt-2 divide-y divide-bw-border rounded-lg border border-bw-border">
            {gscQueries.map((q) => (
              <li
                key={q.query}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <span className="truncate text-bw-text">{q.query}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {q.clicks} Klicks · {q.impressions} Imp.
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

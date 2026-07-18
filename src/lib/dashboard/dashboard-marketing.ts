import 'server-only'

import {
  type DashboardZeitraum,
  zeitraumStartIso,
} from '@/lib/dashboard/dashboard-analytics'
import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import {
  fetchPostHogSummary,
  type MarketingDateRange,
} from '@/lib/ki-hub/sources/posthog'
import { fetchResendSummary } from '@/lib/ki-hub/sources/resend'

export type DashboardMarketingTopQuery = {
  query: string
  clicks: number
  impressions: number
}

export type DashboardMarketingSnapshot = {
  pageviews: number | null
  pageviewsOk: boolean
  pageviewsError: string | null
  gscClicks: number | null
  gscImpressions: number | null
  gscOk: boolean
  gscError: string | null
  topQueries: DashboardMarketingTopQuery[]
  deliveryRatePct: number | null
  resendOk: boolean
  resendError: string | null
}

/** Datumsspanne für Marketing-Quellen — entspricht dem Dashboard-Zeitfilter. */
export function marketingDateRange(
  z: DashboardZeitraum,
  now = new Date()
): MarketingDateRange {
  const to = now.toISOString().slice(0, 10)
  const startIso = zeitraumStartIso(z, now)
  if (startIso) {
    return { from: startIso.slice(0, 10), to }
  }
  // „Gesamt“: Search Console liefert max. ~16 Monate
  const d = new Date(now)
  d.setMonth(d.getMonth() - 16)
  return { from: d.toISOString().slice(0, 10), to }
}

/** Leichtes Laden der Marketing-Zahlen für das Haupt-Dashboard (ohne vollen KI-Hub-Payload). */
export async function loadDashboardMarketing(
  zeitraum: DashboardZeitraum = 'all'
): Promise<DashboardMarketingSnapshot> {
  const range = marketingDateRange(zeitraum)

  const [posthog, google, resend] = await Promise.all([
    fetchPostHogSummary(range).catch(() => ({
      status: 'unavailable' as const,
      error: 'PostHog nicht erreichbar',
      data: undefined,
    })),
    fetchGscSummary(range).catch(() => ({
      status: 'unavailable' as const,
      error: 'Search Console nicht erreichbar',
      data: undefined,
    })),
    fetchResendSummary().catch(() => ({
      status: 'unavailable' as const,
      error: 'Resend nicht erreichbar',
      data: undefined,
    })),
  ])

  const pageviewsRaw = posthog.data?.pageviews ?? posthog.data?.pageviews_7d
  const pageviews =
    typeof pageviewsRaw === 'number' && Number.isFinite(pageviewsRaw) ? pageviewsRaw : null

  const clicksRaw = google.data?.clicks
  const impressionsRaw = google.data?.impressions
  const gscClicks =
    typeof clicksRaw === 'number' && Number.isFinite(clicksRaw) ? clicksRaw : null
  const gscImpressions =
    typeof impressionsRaw === 'number' && Number.isFinite(impressionsRaw)
      ? impressionsRaw
      : null

  const rawQueries = Array.isArray(google.data?.top_queries)
    ? (google.data.top_queries as Array<{
        query?: string
        clicks?: number
        impressions?: number
      }>)
    : []
  const topQueries: DashboardMarketingTopQuery[] =
    google.status === 'ok'
      ? rawQueries.map((q) => ({
          query: String(q.query ?? '—'),
          clicks: Number(q.clicks) || 0,
          impressions: Number(q.impressions) || 0,
        }))
      : []

  const rateRaw = resend.data?.delivery_rate_pct
  const deliveryRatePct =
    typeof rateRaw === 'number' && Number.isFinite(rateRaw) ? rateRaw : null

  return {
    pageviews,
    pageviewsOk: posthog.status === 'ok',
    pageviewsError: posthog.status === 'ok' ? null : (posthog.error ?? 'Nicht verbunden'),
    gscClicks,
    gscImpressions,
    gscOk: google.status === 'ok',
    gscError: google.status === 'ok' ? null : (google.error ?? 'Nicht verbunden'),
    topQueries,
    deliveryRatePct,
    resendOk: resend.status === 'ok',
    resendError: resend.status === 'ok' ? null : (resend.error ?? 'Nicht verbunden'),
  }
}

import 'server-only'

import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import { fetchPostHogSummary } from '@/lib/ki-hub/sources/posthog'
import { fetchResendSummary } from '@/lib/ki-hub/sources/resend'

export type DashboardMarketingSnapshot = {
  pageviews7d: number | null
  pageviewsOk: boolean
  pageviewsError: string | null
  gscClicks: number | null
  gscImpressions: number | null
  gscOk: boolean
  gscError: string | null
  deliveryRatePct: number | null
  resendOk: boolean
  resendError: string | null
}

/** Leichtes Laden der Marketing-Zahlen für das Haupt-Dashboard (ohne vollen KI-Hub-Payload). */
export async function loadDashboardMarketing(): Promise<DashboardMarketingSnapshot> {
  const [posthog, google, resend] = await Promise.all([
    fetchPostHogSummary().catch(() => ({
      status: 'unavailable' as const,
      error: 'PostHog nicht erreichbar',
      data: undefined,
    })),
    fetchGscSummary().catch(() => ({
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

  const pageviewsRaw = posthog.data?.pageviews_7d
  const pageviews7d =
    typeof pageviewsRaw === 'number' && Number.isFinite(pageviewsRaw) ? pageviewsRaw : null

  const clicksRaw = google.data?.clicks
  const impressionsRaw = google.data?.impressions
  const gscClicks =
    typeof clicksRaw === 'number' && Number.isFinite(clicksRaw) ? clicksRaw : null
  const gscImpressions =
    typeof impressionsRaw === 'number' && Number.isFinite(impressionsRaw)
      ? impressionsRaw
      : null

  const rateRaw = resend.data?.delivery_rate_pct
  const deliveryRatePct =
    typeof rateRaw === 'number' && Number.isFinite(rateRaw) ? rateRaw : null

  return {
    pageviews7d,
    pageviewsOk: posthog.status === 'ok',
    pageviewsError: posthog.status === 'ok' ? null : (posthog.error ?? 'Nicht verbunden'),
    gscClicks,
    gscImpressions,
    gscOk: google.status === 'ok',
    gscError: google.status === 'ok' ? null : (google.error ?? 'Nicht verbunden'),
    deliveryRatePct,
    resendOk: resend.status === 'ok',
    resendError: resend.status === 'ok' ? null : (resend.error ?? 'Nicht verbunden'),
  }
}

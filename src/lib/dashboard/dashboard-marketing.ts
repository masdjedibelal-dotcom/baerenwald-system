import 'server-only'

import {
  type DashboardZeitraumFilter,
  getDashboardZeitraumRange,
} from '@/lib/dashboard/dashboard-analytics'
import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import {
  fetchPostHogRechnerFunnel,
  fetchPostHogSummary,
  type MarketingDateRange,
  type RechnerFunnelStep,
} from '@/lib/ki-hub/sources/posthog'
export type DashboardMarketingTopQuery = {
  query: string
  clicks: number
  impressions: number
}

export type DashboardMarketingFunnelStage = {
  key: string
  label: string
  count: number
  /** Anteil vom Rechner-Start (0–100), null wenn Start = 0 */
  pctOfStart: number | null
  /** Absprung gegenüber vorherigem Meilenstein (0–100), null beim ersten Schritt */
  dropoffPct: number | null
  /** Absolute Verluste gegenüber vorherigem Meilenstein */
  dropoffLost: number | null
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
  /** Rechner-Funnel (PostHog) */
  funnelOk: boolean
  funnelError: string | null
  funnelStages: DashboardMarketingFunnelStage[]
  rechnerStart: number | null
  rechnerLead: number | null
}

/** Datumsspanne für Marketing-Quellen — entspricht dem Dashboard-Zeitfilter. */
export function marketingDateRange(
  filter: DashboardZeitraumFilter,
  now = new Date()
): MarketingDateRange {
  const range = getDashboardZeitraumRange(filter, now)
  if (range) {
    return {
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
    }
  }
  // „Gesamt“: Search Console liefert max. ~16 Monate
  const d = new Date(now)
  d.setMonth(d.getMonth() - 16)
  return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

/** Feste Meilensteine — Rohschritte werden per Label zugeordnet und zusammengefasst. */
const FUNNEL_MILESTONES: Array<{
  key: string
  label: string
  match: (label: string) => boolean
}> = [
  { key: 'situation', label: 'Situation', match: (l) => /situation/i.test(l) },
  {
    key: 'bereich',
    label: 'Bereich / Gewerk',
    match: (l) => /bereich|gewerk/i.test(l),
  },
  {
    key: 'groesse',
    label: 'Größe & Details',
    match: (l) => /gr[oö]sse|fl[aä]che|ausstattung|\bbad\b|umfang/i.test(l),
  },
  {
    key: 'preis',
    label: 'Preis & Ergebnis',
    match: (l) => /preis|ergebnis/i.test(l),
  },
  { key: 'plz', label: 'PLZ / Ort', match: (l) => /\bplz\b|\bort\b/i.test(l) },
  {
    key: 'kontakt',
    label: 'Kontakt',
    match: (l) => /kontakt|danke/i.test(l),
  },
]

function buildFunnelStages(
  start: number,
  steps: RechnerFunnelStep[],
  lead: number
): DashboardMarketingFunnelStage[] {
  const pct = (n: number): number | null =>
    start > 0 ? Math.round((n / start) * 1000) / 10 : null

  const bucketMax = new Map<string, number>()
  for (const step of steps) {
    const label = step.label.trim()
    const milestone = FUNNEL_MILESTONES.find((m) => m.match(label))
    if (!milestone) continue
    const prev = bucketMax.get(milestone.key) ?? 0
    if (step.count > prev) bucketMax.set(milestone.key, step.count)
  }

  const raw: Array<{ key: string; label: string; count: number }> = [
    { key: 'start', label: 'Rechner gestartet', count: start },
    ...FUNNEL_MILESTONES.filter((m) => bucketMax.has(m.key)).map((m) => ({
      key: m.key,
      label: m.label,
      count: bucketMax.get(m.key) ?? 0,
    })),
    { key: 'lead', label: 'Anfrage abgeschickt', count: lead },
  ]

  return raw.map((s, i) => {
    const prev = i > 0 ? raw[i - 1]! : null
    let dropoffPct: number | null = null
    let dropoffLost: number | null = null
    if (prev && prev.count > 0) {
      const lost = Math.max(0, prev.count - s.count)
      dropoffLost = lost
      dropoffPct = Math.round((lost / prev.count) * 1000) / 10
    } else if (prev) {
      dropoffLost = 0
      dropoffPct = 0
    }
    return {
      key: s.key,
      label: s.label,
      count: s.count,
      pctOfStart: pct(s.count),
      dropoffPct,
      dropoffLost,
    }
  })
}

/** Leichtes Laden der Marketing-Zahlen für das Haupt-Dashboard (ohne vollen KI-Hub-Payload). */
export async function loadDashboardMarketing(
  zeitraumFilter: DashboardZeitraumFilter = { preset: 'gesamt', von: '', bis: '' }
): Promise<DashboardMarketingSnapshot> {
  const range = marketingDateRange(zeitraumFilter)

  const [posthog, funnel, google] = await Promise.all([
    fetchPostHogSummary(range).catch(() => ({
      status: 'unavailable' as const,
      error: 'PostHog nicht erreichbar',
      data: undefined,
    })),
    fetchPostHogRechnerFunnel(range).catch(() => ({
      status: 'unavailable' as const,
      error: 'PostHog Funnel nicht erreichbar',
      data: undefined,
    })),
    fetchGscSummary(range).catch(() => ({
      status: 'unavailable' as const,
      error: 'Search Console nicht erreichbar',
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

  const rechnerStart =
    funnel.status === 'ok' && funnel.data ? funnel.data.start : null
  const rechnerLead =
    funnel.status === 'ok' && funnel.data ? funnel.data.lead : null
  const funnelStages =
    funnel.status === 'ok' && funnel.data
      ? buildFunnelStages(funnel.data.start, funnel.data.steps, funnel.data.lead)
      : []

  return {
    pageviews,
    pageviewsOk: posthog.status === 'ok',
    pageviewsError: posthog.status === 'ok' ? null : (posthog.error ?? 'Nicht verbunden'),
    gscClicks,
    gscImpressions,
    gscOk: google.status === 'ok',
    gscError: google.status === 'ok' ? null : (google.error ?? 'Nicht verbunden'),
    topQueries,
    funnelOk: funnel.status === 'ok',
    funnelError:
      funnel.status === 'ok'
        ? funnel.error ?? null
        : (funnel.error ?? 'Nicht verbunden'),
    funnelStages,
    rechnerStart,
    rechnerLead,
  }
}

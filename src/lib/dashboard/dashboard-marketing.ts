import 'server-only'

import {
  type DashboardZeitraum,
  inZeitraum,
  zeitraumStartIso,
} from '@/lib/dashboard/dashboard-analytics'
import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import {
  fetchPostHogRechnerFunnel,
  fetchPostHogSummary,
  type MarketingDateRange,
  type RechnerFunnelStep,
} from '@/lib/ki-hub/sources/posthog'
import { fetchResendSummary } from '@/lib/ki-hub/sources/resend'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'

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
}

export type DashboardMarketingNachfrageZeile = {
  typ: 'gewerk' | 'leistung' | 'ort'
  label: string
  count: number
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
  /** Rechner-Funnel (PostHog) */
  funnelOk: boolean
  funnelError: string | null
  funnelStages: DashboardMarketingFunnelStage[]
  rechnerStart: number | null
  rechnerLead: number | null
  /** Top Gewerke / Leistungen / Orte aus CRM-Anfragen */
  nachfrage: DashboardMarketingNachfrageZeile[]
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

const SITUATION_LABELS: Record<string, string> = {
  erneuern: 'Umbau & Modernisierung',
  kaputt: 'Reparatur & Notfall',
  notfall: 'Notfall',
  neubauen: 'Neu bauen / Ausbau',
  betreuung: 'Betreuung',
  gewerbe: 'Gewerbe',
}

function topFromMap(map: Map<string, number>, limit: number): Array<{ label: string; count: number }> {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'))
    .slice(0, limit)
}

function leistungenAusFunnelDaten(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const d = raw as Record<string, unknown>
  const out: string[] = []
  const push = (v: unknown) => {
    const s = String(v ?? '').trim()
    if (s) out.push(s)
  }
  if (Array.isArray(d.leistungen)) {
    for (const x of d.leistungen) {
      if (typeof x === 'string') push(x)
      else if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        push(o.name ?? o.leistung ?? o.label ?? o.titel)
      }
    }
  }
  if (Array.isArray(d.was_zeilen)) {
    for (const x of d.was_zeilen) {
      if (typeof x === 'string') push(x)
      else if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        push(o.name ?? o.leistung ?? o.label)
      }
    }
  }
  if (Array.isArray(d.positionen)) {
    for (const x of d.positionen) {
      if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        push(o.leistung_name ?? o.leistung ?? o.name)
      }
    }
  }
  return out
}

async function loadNachfrageFromLeads(
  zeitraum: DashboardZeitraum
): Promise<DashboardMarketingNachfrageZeile[]> {
  const startIso = zeitraumStartIso(zeitraum)
  try {
    const { data, error } = await withCrmReadFallback(async (db) =>
      db
        .from('leads')
        .select('id, status, situation, bereiche, plz, ort, funnel_daten, created_at')
        .order('created_at', { ascending: false })
        .limit(2000)
    )
    if (error) throw error

    type LeadRow = {
      id: string
      status: string | null
      situation: string | null
      bereiche: string[] | null
      plz: string | null
      ort: string | null
      funnel_daten: unknown
      created_at: string
    }

    const leads = ((data ?? []) as LeadRow[]).filter((row) => {
      if (String(row.status ?? '').toLowerCase() === 'abgebrochen') return false
      return inZeitraum(row.created_at, startIso)
    })

    const gewerkMap = new Map<string, number>()
    const leistungMap = new Map<string, number>()
    const ortMap = new Map<string, number>()

    for (const lead of leads) {
      const bereiche = Array.isArray(lead.bereiche) ? lead.bereiche : []
      for (const b of bereiche) {
        const label = String(b ?? '').trim()
        if (label) gewerkMap.set(label, (gewerkMap.get(label) ?? 0) + 1)
      }

      const sitKey = String(lead.situation ?? '').trim()
      if (sitKey) {
        const sitLabel = SITUATION_LABELS[sitKey] ?? sitKey
        leistungMap.set(sitLabel, (leistungMap.get(sitLabel) ?? 0) + 1)
      }
      for (const name of leistungenAusFunnelDaten(lead.funnel_daten)) {
        leistungMap.set(name, (leistungMap.get(name) ?? 0) + 1)
      }

      const ort = String(lead.ort ?? '').trim()
      const plz = String(lead.plz ?? '').trim()
      const ortLabel = [plz, ort].filter(Boolean).join(' ')
      if (ortLabel) ortMap.set(ortLabel, (ortMap.get(ortLabel) ?? 0) + 1)
    }

    const rows: DashboardMarketingNachfrageZeile[] = [
      ...topFromMap(gewerkMap, 8).map((r) => ({
        typ: 'gewerk' as const,
        label: r.label,
        count: r.count,
      })),
      ...topFromMap(leistungMap, 8).map((r) => ({
        typ: 'leistung' as const,
        label: r.label,
        count: r.count,
      })),
      ...topFromMap(ortMap, 8).map((r) => ({
        typ: 'ort' as const,
        label: r.label,
        count: r.count,
      })),
    ]
    return rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de')).slice(0, 20)
  } catch (e) {
    console.error('[loadNachfrageFromLeads]', e)
    return []
  }
}

function buildFunnelStages(
  start: number,
  steps: RechnerFunnelStep[],
  lead: number
): DashboardMarketingFunnelStage[] {
  const pct = (n: number): number | null =>
    start > 0 ? Math.round((n / start) * 1000) / 10 : null

  const stages: DashboardMarketingFunnelStage[] = [
    { key: 'start', label: 'Rechner gestartet', count: start, pctOfStart: start > 0 ? 100 : null },
    ...steps.map((s) => ({
      key: s.key,
      label: s.label,
      count: s.count,
      pctOfStart: pct(s.count),
    })),
    {
      key: 'lead',
      label: 'Anfrage abgeschickt',
      count: lead,
      pctOfStart: pct(lead),
    },
  ]
  return stages
}

/** Leichtes Laden der Marketing-Zahlen für das Haupt-Dashboard (ohne vollen KI-Hub-Payload). */
export async function loadDashboardMarketing(
  zeitraum: DashboardZeitraum = 'all'
): Promise<DashboardMarketingSnapshot> {
  const range = marketingDateRange(zeitraum)

  const [posthog, funnel, google, resend, nachfrage] = await Promise.all([
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
    fetchResendSummary().catch(() => ({
      status: 'unavailable' as const,
      error: 'Resend nicht erreichbar',
      data: undefined,
    })),
    loadNachfrageFromLeads(zeitraum),
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
    deliveryRatePct,
    resendOk: resend.status === 'ok',
    resendError: resend.status === 'ok' ? null : (resend.error ?? 'Nicht verbunden'),
    funnelOk: funnel.status === 'ok',
    funnelError:
      funnel.status === 'ok'
        ? funnel.error ?? null
        : (funnel.error ?? 'Nicht verbunden'),
    funnelStages,
    rechnerStart,
    rechnerLead,
    nachfrage,
  }
}

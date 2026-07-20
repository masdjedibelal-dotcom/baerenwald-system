import 'server-only'

import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

export type MarketingDateRange = {
  /** YYYY-MM-DD */
  from: string
  /** YYYY-MM-DD */
  to: string
}

export type RechnerFunnelStep = {
  key: string
  label: string
  /** Unique persons (distinct_id) */
  count: number
}

function extractTrendCount(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { results?: Array<{ count?: number; data?: number[] }> }
  const first = r.results?.[0]
  if (first?.count != null) return first.count
  if (Array.isArray(first?.data)) {
    return first.data.reduce((a, b) => a + (b ?? 0), 0)
  }
  return null
}

function posthogConfig():
  | { ok: true; host: string; projectId: string; apiKey: string }
  | { ok: false; error: string } {
  const apiKey = process.env.POSTHOG_API_KEY?.trim()
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim()
  if (!apiKey || !projectId) {
    return { ok: false, error: 'POSTHOG_API_KEY oder POSTHOG_PROJECT_ID fehlt' }
  }
  return {
    ok: true,
    host: process.env.POSTHOG_HOST?.trim() || 'https://eu.posthog.com',
    projectId,
    apiKey,
  }
}

async function posthogQuery(
  cfg: { host: string; projectId: string; apiKey: string },
  body: unknown
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${cfg.host}/api/projects/${cfg.projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    })
    const text = await res.text()
    if (!res.ok) {
      let hint = ''
      if (res.status === 401 || res.status === 403) {
        hint =
          ' — Personal API Key mit Scope „Query Read“ verwenden (nicht phc_-Ingest-Key). Host (eu/us) und PROJECT_ID prüfen.'
      }
      return { ok: false, error: `PostHog ${res.status}: ${text.slice(0, 120)}${hint}` }
    }
    try {
      return { ok: true, json: JSON.parse(text) as unknown }
    } catch {
      return { ok: false, error: 'PostHog: keine JSON-Antwort (Host/Key prüfen)' }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'PostHog Fehler' }
  }
}

function defaultRange(range?: MarketingDateRange): { from: string; to: string } {
  if (range?.from && range?.to) return { from: range.from, to: range.to }
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

function hogqlDateLiteral(ymd: string): string {
  // YYYY-MM-DD → safe literal for HogQL
  const safe = ymd.replace(/[^0-9-]/g, '').slice(0, 10)
  return `'${safe}'`
}

export async function fetchPostHogSummary(
  range?: MarketingDateRange
): Promise<KiHubQuelleResult<Record<string, unknown>>> {
  const cfg = posthogConfig()
  if (!cfg.ok) return { status: 'unavailable', error: cfg.error }

  const { from: dateFrom, to: dateTo } = defaultRange(range)

  const result = await posthogQuery(cfg, {
    query: {
      kind: 'TrendsQuery',
      series: [{ event: '$pageview', kind: 'EventsNode' }],
      dateRange: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    },
    name: 'crm-dashboard-pageviews',
  })

  if (!result.ok) return { status: 'unavailable', error: result.error }

  const pageviews = extractTrendCount(result.json)

  return {
    status: 'ok',
    data: {
      pageviews_7d: pageviews,
      pageviews: pageviews,
      date_from: dateFrom,
      date_to: dateTo,
      host: cfg.host,
      project_id: cfg.projectId,
    },
  }
}

function parseHogqlRows(json: unknown): unknown[][] {
  if (!json || typeof json !== 'object') return []
  const r = json as { results?: unknown }
  if (!Array.isArray(r.results)) return []
  // HogQL: results is array of rows; Trends sometimes nest differently
  if (r.results.length && Array.isArray(r.results[0])) {
    return r.results as unknown[][]
  }
  return []
}

/** Rechner-Funnel: Start → Schritte → Lead abgeschickt (unique persons). */
export async function fetchPostHogRechnerFunnel(
  range?: MarketingDateRange
): Promise<
  KiHubQuelleResult<{
    start: number
    lead: number
    steps: RechnerFunnelStep[]
  }>
> {
  const cfg = posthogConfig()
  if (!cfg.ok) return { status: 'unavailable', error: cfg.error }

  const { from, to } = defaultRange(range)
  const fromLit = hogqlDateLiteral(from)
  const toLit = hogqlDateLiteral(to)

  const timeFilter = `timestamp >= toDateTime(${fromLit}) AND timestamp < toDateTime(${toLit}) + INTERVAL 1 DAY`

  const [startsRes, leadsRes, stepsRes] = await Promise.all([
    posthogQuery(cfg, {
      query: {
        kind: 'HogQLQuery',
        query: `SELECT count(DISTINCT distinct_id) FROM events WHERE event = 'rechner_start' AND ${timeFilter}`,
      },
      name: 'crm-rechner-start',
    }),
    posthogQuery(cfg, {
      query: {
        kind: 'HogQLQuery',
        query: `SELECT count(DISTINCT distinct_id) FROM events WHERE event = 'lead_abgeschickt' AND ${timeFilter}`,
      },
      name: 'crm-rechner-lead',
    }),
    posthogQuery(cfg, {
      query: {
        kind: 'HogQLQuery',
        query: `
SELECT
  toIntOrZero(toString(properties.schritt_nummer)) AS schritt,
  any(toString(properties.schritt_name)) AS name,
  count(DISTINCT distinct_id) AS persons
FROM events
WHERE event = 'rechner_schritt'
  AND ${timeFilter}
  AND properties.schritt_nummer IS NOT NULL
GROUP BY schritt
HAVING schritt > 0
ORDER BY schritt ASC
LIMIT 40
`.trim(),
      },
      name: 'crm-rechner-schritte',
    }),
  ])

  if (!startsRes.ok && !leadsRes.ok && !stepsRes.ok) {
    return {
      status: 'unavailable',
      error: startsRes.ok ? (leadsRes.ok ? stepsRes.error! : leadsRes.error!) : startsRes.error!,
    }
  }

  const startRows = startsRes.ok ? parseHogqlRows(startsRes.json) : []
  const leadRows = leadsRes.ok ? parseHogqlRows(leadsRes.json) : []
  const stepRows = stepsRes.ok ? parseHogqlRows(stepsRes.json) : []

  const start = Number(startRows[0]?.[0] ?? 0) || 0
  const lead = Number(leadRows[0]?.[0] ?? 0) || 0

  const steps: RechnerFunnelStep[] = stepRows
    .map((row) => {
      const schritt = Number(row[0])
      const name = String(row[1] ?? '').trim() || `Schritt ${schritt}`
      const count = Number(row[2] ?? 0) || 0
      if (!Number.isFinite(schritt) || schritt <= 0) return null
      return {
        key: `schritt-${schritt}`,
        label: name,
        count,
      } satisfies RechnerFunnelStep
    })
    .filter((x): x is RechnerFunnelStep => x != null)

  return {
    status: 'ok',
    data: { start, lead, steps },
    error:
      !startsRes.ok || !leadsRes.ok || !stepsRes.ok
        ? [startsRes, leadsRes, stepsRes]
            .filter((r): r is { ok: false; error: string } => !r.ok)
            .map((r) => r.error)
            .join(' · ')
        : undefined,
  }
}

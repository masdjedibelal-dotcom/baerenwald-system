import 'server-only'

import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

function extractPageviews(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { results?: Array<{ count?: number; data?: number[] }> }
  const first = r.results?.[0]
  if (first?.count != null) return first.count
  if (Array.isArray(first?.data)) {
    return first.data.reduce((a, b) => a + (b ?? 0), 0)
  }
  return null
}

export async function fetchPostHogSummary(): Promise<KiHubQuelleResult<Record<string, unknown>>> {
  const apiKey = process.env.POSTHOG_API_KEY?.trim()
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim()
  if (!apiKey || !projectId) {
    return { status: 'unavailable', error: 'POSTHOG_API_KEY oder POSTHOG_PROJECT_ID fehlt' }
  }

  try {
    const host = process.env.POSTHOG_HOST?.trim() || 'https://eu.posthog.com'
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 7)

    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          kind: 'TrendsQuery',
          series: [{ event: '$pageview', kind: 'EventsNode' }],
          dateRange: {
            date_from: start.toISOString().slice(0, 10),
            date_to: end.toISOString().slice(0, 10),
          },
        },
      }),
      next: { revalidate: 0 },
    })

    const text = await res.text()
    if (!res.ok) {
      let hint = ''
      if (res.status === 401 || res.status === 403) {
        hint =
          ' — Personal API Key mit Scope „Query Read“ verwenden (nicht phc_-Ingest-Key). Host (eu/us) und PROJECT_ID prüfen.'
      }
      return {
        status: 'unavailable',
        error: `PostHog ${res.status}: ${text.slice(0, 80)}${hint}`,
      }
    }

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return { status: 'unavailable', error: 'PostHog: keine JSON-Antwort (Host/Key prüfen)' }
    }

    const pageviews = extractPageviews(json)

    return {
      status: 'ok',
      data: {
        pageviews_7d: pageviews,
        zeitraum_tage: 7,
        host,
        project_id: projectId,
      },
    }
  } catch (e) {
    return {
      status: 'unavailable',
      error: e instanceof Error ? e.message : 'PostHog Fehler',
    }
  }
}

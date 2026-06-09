import 'server-only'

import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

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
          dateRange: { date_from: start.toISOString().slice(0, 10), date_to: end.toISOString().slice(0, 10) },
        },
      }),
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return { status: 'unavailable', error: `PostHog ${res.status}` }
    }
    const json = await res.json()
    return { status: 'ok', data: { raw: json, zeitraum_tage: 7 } }
  } catch (e) {
    return {
      status: 'unavailable',
      error: e instanceof Error ? e.message : 'PostHog Fehler',
    }
  }
}

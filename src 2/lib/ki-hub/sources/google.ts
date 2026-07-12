import 'server-only'

import { fetchGscAccessToken } from '@/lib/ki-hub/sources/gsc-auth'
import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

type GscRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

export async function fetchGscSummary(): Promise<KiHubQuelleResult<Record<string, unknown>>> {
  const siteUrl = process.env.GSC_SITE_URL?.trim()

  if (!siteUrl) {
    return { status: 'unavailable', error: 'GSC_SITE_URL fehlt' }
  }

  try {
    const { token, mode, serviceAccountEmail } = await fetchGscAccessToken()
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 28)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const encodedSite = encodeURIComponent(siteUrl)

    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: ['query'],
          rowLimit: 10,
        }),
        next: { revalidate: 0 },
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      let hint = ''
      if (res.status === 403) {
        hint =
          mode === 'oauth'
            ? ` — Mit dem verbundenen Google-Konto in Search Console als Eigentümer anmelden; GSC_SITE_URL exakt wie Property (${siteUrl}).`
            : ` — ${serviceAccountEmail ?? 'Service-Account'} in Search Console unter „Nutzer“ mit Vollzugriff einladen; GSC_SITE_URL exakt wie Property (${siteUrl}).`
      }
      return {
        status: 'unavailable',
        error: `GSC ${res.status}: ${errText.slice(0, 100)}${hint}`,
      }
    }

    const json = (await res.json()) as { rows?: GscRow[] }
    const rows = json.rows ?? []
    const totals = rows.reduce<{ clicks: number; impressions: number }>(
      (acc, row) => ({
        clicks: acc.clicks + (row.clicks ?? 0),
        impressions: acc.impressions + (row.impressions ?? 0),
      }),
      { clicks: 0, impressions: 0 }
    )

    const topQueries = rows.slice(0, 5).map((row) => ({
      query: row.keys?.[0] ?? '—',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr_pct: row.ctr != null ? Math.round(row.ctr * 1000) / 10 : null,
      position: row.position != null ? Math.round(row.position * 10) / 10 : null,
    }))

    return {
      status: 'ok',
      data: {
        site_url: siteUrl,
        auth_mode: mode,
        zeitraum_tage: 28,
        clicks: totals.clicks,
        impressions: totals.impressions,
        top_queries: topQueries,
      },
    }
  } catch (e) {
    return {
      status: 'unavailable',
      error: e instanceof Error ? e.message : 'GSC Fehler',
    }
  }
}

import 'server-only'

import { createSign } from 'crypto'
import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

type ServiceAccount = {
  client_email: string
  private_key: string
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ServiceAccount
    if (!parsed.client_email || !parsed.private_key) return null
    // Netlify: \n oft als Literal — für JWT-Signatur normalisieren
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    return parsed
  } catch {
    return null
  }
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const signInput = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signInput)
  sign.end()
  const signature = base64url(sign.sign(sa.private_key))
  const jwt = `${signInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    next: { revalidate: 0 },
  })

  const json = (await res.json()) as { access_token?: string; error_description?: string }
  if (!json.access_token) {
    throw new Error(json.error_description ?? 'Google Token fehlgeschlagen')
  }
  return json.access_token
}

type GscRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

export async function fetchGscSummary(): Promise<KiHubQuelleResult<Record<string, unknown>>> {
  const siteUrl = process.env.GSC_SITE_URL?.trim()
  const sa = parseServiceAccount()

  if (!siteUrl) {
    return { status: 'unavailable', error: 'GSC_SITE_URL fehlt' }
  }
  if (!sa) {
    return { status: 'unavailable', error: 'GSC_SERVICE_ACCOUNT_JSON fehlt' }
  }

  try {
    const token = await getGoogleAccessToken(sa)
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
        hint = ` — ${sa.client_email} in Search Console unter „Nutzer“ mit Vollzugriff einladen; GSC_SITE_URL exakt wie Property (${siteUrl}).`
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

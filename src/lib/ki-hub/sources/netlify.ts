import 'server-only'

import type { KiHubQuelleResult } from '@/lib/ki-hub/types'

export async function fetchNetlifyDeployStatus(): Promise<
  KiHubQuelleResult<Record<string, unknown>>
> {
  const token = process.env.NETLIFY_API_TOKEN?.trim()
  const siteId = process.env.NETLIFY_SITE_ID?.trim()
  if (!token || !siteId) {
    return { status: 'unavailable', error: 'NETLIFY_API_TOKEN oder NETLIFY_SITE_ID fehlt' }
  }

  try {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) {
      return { status: 'unavailable', error: `Netlify ${res.status}` }
    }
    const deploys = (await res.json()) as Array<{
      state?: string
      error_message?: string
      deploy_ssl_url?: string
      created_at?: string
    }>
    const latest = deploys[0]
    if (!latest) return { status: 'partial', data: { state: 'unknown' } }

    return {
      status: 'ok',
      data: {
        state: latest.state ?? 'unknown',
        error_message: latest.error_message ?? null,
        deploy_url: latest.deploy_ssl_url ?? null,
        created_at: latest.created_at ?? null,
        admin_url: `https://app.netlify.com/sites/${siteId}/deploys`,
      },
    }
  } catch (e) {
    return {
      status: 'unavailable',
      error: e instanceof Error ? e.message : 'Netlify Fehler',
    }
  }
}

import 'server-only'

import { gptVizInternalApiSecret, gptVizSiteBaseUrl } from '@/lib/gpt-viz/site-url'

export async function fetchGptZielbildFromWebsite(
  sessionId: string,
  force = false
): Promise<{ ok: true; zielbild_url: string } | { ok: false; error: string }> {
  const sid = sessionId.trim()
  if (!sid) return { ok: false, error: 'gpt_session_id fehlt' }

  const secret = gptVizInternalApiSecret()
  if (!secret) {
    return {
      ok: false,
      error:
        'PARTNER_INTERNAL_API_SECRET fehlt — Zielbild kann nicht von der Website geladen werden.',
    }
  }

  const url = `${gptVizSiteBaseUrl()}/api/gpt-viz/zielbild`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sid, force }),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    return { ok: false, error: `Zielbild-API: ${msg}` }
  }

  let body: { zielbild_url?: string; error?: string } = {}
  try {
    body = (await res.json()) as typeof body
  } catch {
    return { ok: false, error: `Zielbild-API Antwort ungültig (HTTP ${res.status})` }
  }

  if (!res.ok || !body.zielbild_url?.trim()) {
    return {
      ok: false,
      error: body.error ?? `Zielbild-API fehlgeschlagen (HTTP ${res.status})`,
    }
  }

  return { ok: true, zielbild_url: body.zielbild_url.trim() }
}

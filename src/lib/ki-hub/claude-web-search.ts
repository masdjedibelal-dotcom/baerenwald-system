import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

/** SDK-Typen kennen web_search noch nicht — eigene Form für die API-Nutzung. */
type KiHubWebSearchTool = {
  type: 'web_search_20250305'
  name: 'web_search'
  max_uses: number
  user_location: {
    type: 'approximate'
    city: string
    region: string
    country: string
    timezone: string
  }
}

/** Anthropic Server-Tool — Recherche läuft bei Anthropic, kein Tavily nötig. */
export function isKiHubWebSearchEnabled(): boolean {
  const flag = process.env.KI_HUB_WEB_SEARCH?.trim().toLowerCase()
  if (flag === '0' || flag === 'false' || flag === 'off') return false
  return true
}

export function getKiHubWebSearchMaxUses(): number {
  const raw = process.env.KI_HUB_WEB_SEARCH_MAX_USES?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 3
  if (!Number.isFinite(n) || n < 1) return 3
  return Math.min(n, 5)
}

/** Sonnet 4.6 — Standard web_search ohne Code-Execution-Pflicht. */
export function getKiHubWebSearchTools(): Anthropic.MessageCreateParams['tools'] {
  const webSearchTool: KiHubWebSearchTool = {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: getKiHubWebSearchMaxUses(),
    user_location: {
      type: 'approximate',
      city: 'München',
      region: 'Bayern',
      country: 'DE',
      timezone: 'Europe/Berlin',
    },
  }
  return [webSearchTool] as unknown as Anthropic.MessageCreateParams['tools']
}

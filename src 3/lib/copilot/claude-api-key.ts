import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

/** Direkt zu Anthropic — nicht über Netlify AI Gateway (/.netlify/ai/…). */
export const ANTHROPIC_DIRECT_BASE_URL = 'https://api.anthropic.com'

/** Bekanntes Claude-Modell (Stand 2026). */
export const COPILOT_MODEL_PRIMARY = 'claude-sonnet-4-6'

/** Optional überschreibbar via Netlify `CLAUDE_MODEL`. */
export function getClaudeModel(): string {
  const custom = process.env.CLAUDE_MODEL?.trim()
  return custom || COPILOT_MODEL_PRIMARY
}

/** Entfernt BOM, Anführungszeichen und Leerzeichen (häufig bei Copy/Paste in Netlify). */
export function normalizeClaudeApiKey(raw: string | undefined): string {
  if (!raw) return ''
  let k = raw.trim().replace(/^\uFEFF/, '')
  if (k.toLowerCase().startsWith('bearer ')) {
    k = k.slice(7).trim()
  }
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim()
  }
  return k.replace(/\s/g, '')
}

export type ClaudeKeySource = 'CLAUDE_API_KEY' | 'ANTHROPIC_API_KEY' | 'none'

/** Beide gesetzt: gültiges `sk-ant-…` gewinnt (häufig alter Wert in CLAUDE_API_KEY). */
export function getClaudeApiKey(): string {
  const claude = normalizeClaudeApiKey(process.env.CLAUDE_API_KEY)
  const anthropic = normalizeClaudeApiKey(process.env.ANTHROPIC_API_KEY)
  if (!claude) return anthropic
  if (!anthropic) return claude
  const claudeOk = claudeApiKeyLooksValid(claude)
  const anthropicOk = claudeApiKeyLooksValid(anthropic)
  if (claudeOk && !anthropicOk) return claude
  if (anthropicOk && !claudeOk) return anthropic
  return claude
}

export function getClaudeApiKeySource(): ClaudeKeySource {
  const claude = normalizeClaudeApiKey(process.env.CLAUDE_API_KEY)
  const anthropic = normalizeClaudeApiKey(process.env.ANTHROPIC_API_KEY)
  const resolved = getClaudeApiKey()
  if (!resolved) return 'none'
  if (resolved === claude && claude) return 'CLAUDE_API_KEY'
  if (resolved === anthropic && anthropic) return 'ANTHROPIC_API_KEY'
  return 'CLAUDE_API_KEY'
}

export function claudeApiKeyLooksValid(key: string): boolean {
  return /^sk-ant-/.test(key) && key.length > 20
}

/** Netlify injiziert ANTHROPIC_BASE_URL → Gateway; mit eigenem Key → 401. */
export function isNetlifyAiGatewayBaseUrl(): boolean {
  const base = process.env.ANTHROPIC_BASE_URL?.trim() ?? ''
  return base.includes('/.netlify/ai') || base.includes('netlify.app/.netlify/ai')
}

/** Anthropic-Client: eigener Key + feste API-URL (ignoriert Netlify-Gateway-Env). */
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_DIRECT_BASE_URL,
  })
}

/** Nur für Fehlermeldungen — kein vollständiger Key. */
export function describeClaudeKeyForDebug(): string {
  const key = getClaudeApiKey()
  if (!key) return 'kein Key gesetzt'
  const gateway = isNetlifyAiGatewayBaseUrl()
    ? ', Netlify-Gateway-Env aktiv (wird im Code umgangen)'
    : ''
  return `Quelle=${getClaudeApiKeySource()}, Länge=${key.length}, Anfang=${key.slice(0, 16)}…, Format=${claudeApiKeyLooksValid(key) ? 'ok' : 'ungültig'}${gateway}`
}

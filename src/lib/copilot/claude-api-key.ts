import 'server-only'

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
  return k
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
  return /^sk-ant-/.test(key)
}

/** Nur für Fehlermeldungen — kein vollständiger Key. */
export function describeClaudeKeyForDebug(): string {
  const key = getClaudeApiKey()
  if (!key) return 'kein Key gesetzt'
  return `Quelle=${getClaudeApiKeySource()}, Länge=${key.length}, Anfang=${key.slice(0, 16)}…, Format=${claudeApiKeyLooksValid(key) ? 'ok' : 'ungültig'}`
}

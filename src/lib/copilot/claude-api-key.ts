import 'server-only'

/** Entfernt BOM, Anführungszeichen und Leerzeichen (häufig bei Copy/Paste in Netlify). */
export function normalizeClaudeApiKey(raw: string | undefined): string {
  if (!raw) return ''
  let k = raw.trim().replace(/^\uFEFF/, '')
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim()
  }
  return k
}

/** `CLAUDE_API_KEY` bevorzugt; Fallback `ANTHROPIC_API_KEY` (offizieller SDK-Name). */
export function getClaudeApiKey(): string {
  return normalizeClaudeApiKey(
    process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY
  )
}

export function claudeApiKeyLooksValid(key: string): boolean {
  return /^sk-ant-/.test(key)
}

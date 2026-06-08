import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_DIRECT_BASE_URL = 'https://api.anthropic.com'

export const KI_CLAUDE_MODEL_PRIMARY = 'claude-sonnet-4-6'

export function getClaudeModel() {
  return process.env.CLAUDE_MODEL?.trim() || KI_CLAUDE_MODEL_PRIMARY
}

function normalizeKey(raw) {
  if (!raw) return ''
  let k = String(raw).trim().replace(/^\uFEFF/, '')
  if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1).trim()
  return k
}

export function getClaudeApiKey() {
  return normalizeKey(process.env.CLAUDE_API_KEY) || normalizeKey(process.env.ANTHROPIC_API_KEY)
}

/** @param {{ system: string, user: string, maxTokens?: number }} opts */
export async function claudeText({ system, user, maxTokens = 900 }) {
  const apiKey = getClaudeApiKey()
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY oder ANTHROPIC_API_KEY in .env.local fehlt')
  }

  const client = new Anthropic({ apiKey, baseURL: ANTHROPIC_DIRECT_BASE_URL })
  const res = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  if (!text) throw new Error('Claude lieferte keinen Text')
  return text
}

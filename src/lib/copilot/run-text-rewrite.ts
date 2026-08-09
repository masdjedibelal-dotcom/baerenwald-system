import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import {
  createAnthropicClient,
  claudeAuthErrorForClient,
  describeClaudeKeyForDebug,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatUnknownError } from '@/lib/copilot/format-unknown-error'
import { truncateCopilotText } from '@/lib/copilot/message-limits'

const REWRITE_SYSTEM = `Du bist Texthilfe für das Handwerks-CRM Bärenwald.
Du schreibst kundensichtbare Texte um (Mails, Anschreiben, Beschreibungen).
Regeln:
- Nur den fertigen Text zurückgeben
- Kein Vorwort, keine Erklärung, kein Markdown, keine Anführungszeichen um den ganzen Text
- Deutsch, klar, freundlich, ohne Marketing-Floskeln
- Keine erfundenen Preise, Termine oder Zusagen`

function formatError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    console.error('[copilot/rewrite] Claude 401', describeClaudeKeyForDebug())
    return claudeAuthErrorForClient()
  }
  const msg = formatUnknownError(e)
  if (/401.*no body/i.test(msg)) {
    console.error('[copilot/rewrite] Claude 401 (no body)', describeClaudeKeyForDebug())
    return claudeAuthErrorForClient()
  }
  return msg
}

/** Leichter Claude-Call ohne Tools — nur Text umschreiben. */
export async function runTextRewrite(userPrompt: string): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const prompt = userPrompt.trim()
  if (!prompt) return { ok: false, error: 'Leerer Prompt.' }

  try {
    const anthropic = createAnthropicClient(getClaudeApiKey())
    const response = await anthropic.messages.create({
      model: getClaudeModel(),
      max_tokens: 1200,
      system: REWRITE_SYSTEM,
      messages: [{ role: 'user', content: truncateCopilotText(prompt, 8000) }],
    })
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
      .replace(/^["«»„“]+|["«»„“]+$/g, '')
    if (!text) return { ok: false, error: 'Leere KI-Antwort.' }
    return { ok: true, text }
  } catch (e) {
    return { ok: false, error: formatError(e) }
  }
}

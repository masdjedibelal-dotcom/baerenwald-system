import 'server-only'

import { createAnthropicClient, getClaudeApiKey, getClaudeModel } from '@/lib/copilot/claude-api-key'
import { getOpenAiApiKey, kiAnbieter, KiAnbieterFehler, openAiAlsClaudeClient } from '@/lib/shared-domain/ki-openai'

export { kiAnbieter }

/** Gleiche Form für beide Anbieter: Text rein, Textblöcke raus. */
export type KiTextClient = {
  messages: {
    create(p: {
      model?: string
      max_tokens: number
      system?: string
      messages: { role: 'user' | 'assistant'; content: string }[]
    }): Promise<{ content: { type: 'text'; text: string }[]; stop_reason: string | null }>
  }
}

/** Ist ein KI-Schlüssel hinterlegt (OpenAI oder Claude)? */
export function kiKonfiguriert(): boolean {
  return kiAnbieter() === 'openai' ? Boolean(getOpenAiApiKey()) : Boolean(getClaudeApiKey())
}

/** KI-Client für einfache Text-Aufrufe — OpenAI, sobald OPENAI_API_KEY gesetzt ist, sonst Claude. */
export function kiTextClient(): KiTextClient {
  if (kiAnbieter() === 'openai') return openAiAlsClaudeClient()
  const anthropic = createAnthropicClient(getClaudeApiKey())
  return {
    messages: {
      async create(p) {
        const r = await anthropic.messages.create({ ...p, model: getClaudeModel() })
        return {
          content: r.content.flatMap((b) => (b.type === 'text' ? [{ type: 'text' as const, text: b.text }] : [])),
          stop_reason: r.stop_reason,
        }
      },
    },
  }
}

/** Fehlertext für OpenAI-Fehler (Claude-Fehler formatiert weiter formatAnthropicError). */
export function formatKiAnbieterFehler(e: unknown): string | null {
  if (!(e instanceof KiAnbieterFehler)) return null
  if (e.status === 401 || e.status === 403) return 'OpenAI-Schlüssel ungültig — OPENAI_API_KEY in Netlify prüfen.'
  if (e.status === 404) return 'OpenAI-Modell nicht verfügbar — OPENAI_MODEL in Netlify prüfen.'
  if (e.status === 429) return 'OpenAI-Limit erreicht oder Guthaben aufgebraucht — kurz warten bzw. Abrechnung bei OpenAI prüfen.'
  return e.message || `OpenAI-Fehler (${e.status})`
}

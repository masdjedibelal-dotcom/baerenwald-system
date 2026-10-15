/**
 * KI-Anbieter wählen und OpenAI ansprechen (CRM + Website via Sync). Rein: nur fetch, keine Pakete.
 *
 * Umgebung (Netlify):
 *   OPENAI_API_KEY      gesetzt → KI läuft über OpenAI (sonst wie bisher Claude)
 *   OPENAI_MODEL        optional, Standard siehe OPENAI_MODEL_STANDARD
 *   OPENAI_REASONING    optional (z. B. low, medium) — nur für Modelle mit „reasoning_effort“
 *   KI_ANBIETER         optional „claude“ erzwingt Claude trotz OpenAI-Key (Rückweg ohne Löschen)
 */

export const OPENAI_MODEL_STANDARD = 'gpt-5-mini'
const OPENAI_BASIS = 'https://api.openai.com/v1'

export type KiAnbieter = 'openai' | 'claude'

function saeubern(raw: string | undefined): string {
  return String(raw ?? '')
    .trim()
    .replace(/^﻿/, '')
    .replace(/^bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '')
}

export function getOpenAiApiKey(): string {
  return saeubern(process.env.OPENAI_API_KEY)
}

export function kiAnbieter(): KiAnbieter {
  if (process.env.KI_ANBIETER?.trim().toLowerCase() === 'claude') return 'claude'
  return getOpenAiApiKey() ? 'openai' : 'claude'
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_MODEL_STANDARD
}

export type OpenAiNachricht =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type OpenAiToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

export type OpenAiWerkzeug = {
  type: 'function'
  function: { name: string; description?: string; parameters: Record<string, unknown> }
}

export type OpenAiAntwort = {
  text: string
  toolCalls: OpenAiToolCall[]
  /** stop | length | tool_calls | … */
  ende: string | null
  /** Rohe Assistent-Nachricht (für die Werkzeug-Schleife wieder anhängen) */
  nachricht: Extract<OpenAiNachricht, { role: 'assistant' }>
}

/** Fehler mit HTTP-Status wie beim Anthropic-SDK (status 401/404/429 …), damit bestehende Fehlertexte greifen. */
export class KiAnbieterFehler extends Error {
  status: number
  type: string
  constructor(message: string, status: number, type: string) {
    super(message)
    this.name = 'KiAnbieterFehler'
    this.status = status
    this.type = type
  }
}

function fehlerTyp(status: number): string {
  if (status === 401 || status === 403) return 'authentication_error'
  if (status === 404) return 'not_found_error'
  if (status === 429) return 'rate_limit_error'
  if (status >= 500) return 'overloaded_error'
  return 'api_error'
}

/** Ein Aufruf an die Chat-Completions-API. maxTokens = gewünschte Antwortlänge (Reserve fürs Denken wird ergänzt). */
export async function openAiChat(input: {
  system?: string | null
  messages: OpenAiNachricht[]
  maxTokens: number
  tools?: OpenAiWerkzeug[]
  apiKey?: string
}): Promise<OpenAiAntwort> {
  const apiKey = input.apiKey || getOpenAiApiKey()
  if (!apiKey) throw new KiAnbieterFehler('OPENAI_API_KEY fehlt', 401, 'authentication_error')
  const model = getOpenAiModel()
  // Modelle der gpt-5-/o-Reihe denken vorab — das zählt zum Token-Budget
  const denkt = /^(gpt-5|o\d)/i.test(model)
  const reasoning = process.env.OPENAI_REASONING?.trim() || (model === OPENAI_MODEL_STANDARD ? 'low' : '')
  const body: Record<string, unknown> = {
    model,
    messages: [...(input.system?.trim() ? [{ role: 'system', content: input.system }] : []), ...input.messages],
    max_completion_tokens: denkt ? input.maxTokens + 4000 : input.maxTokens,
    ...(input.tools?.length ? { tools: input.tools } : {}),
    ...(denkt && reasoning ? { reasoning_effort: reasoning } : {}),
  }
  const basis = process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASIS
  const res = await fetch(`${basis.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as {
    choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }[]
    error?: { message?: string; type?: string; code?: string }
  }
  if (!res.ok) {
    const msg = json.error?.message || `OpenAI-Fehler ${res.status}`
    throw new KiAnbieterFehler(msg, res.status, json.error?.code === 'insufficient_quota' ? 'rate_limit_error' : fehlerTyp(res.status))
  }
  const wahl = json.choices?.[0]
  const text = (wahl?.message?.content ?? '').trim()
  const toolCalls = wahl?.message?.tool_calls ?? []
  return {
    text,
    toolCalls,
    ende: wahl?.finish_reason ?? null,
    nachricht: { role: 'assistant', content: wahl?.message?.content ?? null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) },
  }
}

/**
 * Einfacher Text-Aufruf in der Form, die der bestehende Code vom Anthropic-SDK kennt
 * (`messages.create` → `{ content: [{ type: 'text', text }] }`).
 */
export function openAiAlsClaudeClient(apiKey?: string) {
  return {
    messages: {
      async create(p: {
        model?: string
        max_tokens: number
        system?: string
        messages: { role: 'user' | 'assistant'; content: string }[]
      }): Promise<{ content: { type: 'text'; text: string }[]; stop_reason: string | null }> {
        const r = await openAiChat({
          apiKey,
          system: p.system,
          maxTokens: p.max_tokens,
          messages: p.messages.map((m) => ({ role: m.role, content: m.content })),
        })
        return { content: [{ type: 'text', text: r.text }], stop_reason: r.ende === 'length' ? 'max_tokens' : 'end_turn' }
      },
    },
  }
}

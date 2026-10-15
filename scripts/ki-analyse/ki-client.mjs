/**
 * Text von OpenAI für die KI-Auswertungen (CLI + /api/ki/refresh). Nur fetch, kein Paket.
 * Umgebung: OPENAI_API_KEY (Pflicht), OPENAI_MODEL (optional, Standard gpt-5-mini).
 */
const OPENAI_BASIS = 'https://api.openai.com/v1'
const OPENAI_MODEL_STANDARD = 'gpt-5-mini'

function saeubern(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^﻿/, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '')
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || OPENAI_MODEL_STANDARD
}

/** @param {{ system: string, user: string, maxTokens?: number }} opts */
export async function kiText({ system, user, maxTokens = 900 }) {
  const apiKey = saeubern(process.env.OPENAI_API_KEY)
  if (!apiKey) throw new Error('OPENAI_API_KEY fehlt (Netlify bzw. .env.local)')
  const model = getOpenAiModel()
  const denkt = /^(gpt-5|o\d)/i.test(model)
  const reasoning = process.env.OPENAI_REASONING?.trim() || (model === OPENAI_MODEL_STANDARD ? 'low' : '')
  const basis = (process.env.OPENAI_BASE_URL?.trim() || OPENAI_BASIS).replace(/\/$/, '')
  const res = await fetch(`${basis}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: denkt ? maxTokens + 4000 : maxTokens,
      ...(denkt && reasoning ? { reasoning_effort: reasoning } : {}),
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI-Fehler ${res.status}`)
  const text = String(json?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new Error('OpenAI lieferte keinen Text')
  return text
}

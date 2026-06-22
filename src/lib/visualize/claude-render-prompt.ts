import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import type { VizBrief, VizRaumAnalyse } from '@/lib/visualize/types'

const SYSTEM = `Du übersetzt deutsche Renovierungswünsche in einen englischen Stable-Diffusion-Prompt
für ein Interior-Design-Modell (bestehender Raum, gleiche Kameraposition).
Antwort NUR mit dem englischen Prompt als Plain Text, ohne Anführungszeichen, max. 140 Wörter.

Pflicht-Struktur im Prompt:
1. MUST PRESERVE: Liste der Elemente die unverändert bleiben
2. CHANGE ONLY: was sich ändern darf
3. DO NOT: keine neuen Fenster/Türen/Grundrissänderung (wenn struktur_lock)
4. Stil, Materialien, Licht — fotorealistisch, keine Menschen, kein Text`

export async function buildRenderPrompt(input: {
  wunschText: string
  raumAnalyse?: VizRaumAnalyse | null
  vizBrief?: VizBrief | null
  nachprompt?: string
}): Promise<string> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt.')

  const kontext = input.raumAnalyse
    ? `Raum: ${input.raumAnalyse.raum_label}. Ist: ${input.raumAnalyse.ist_beschreibung}`
    : 'Raum unbekannt'

  const brief = input.vizBrief
  const briefCtx = brief
    ? [
        `Modus: ${brief.modus}`,
        `Struktur fix: ${brief.struktur_lock ? 'ja' : 'nein'}`,
        `Preserve: ${brief.preserve.join(', ')}`,
        `Ändern: ${brief.aenderungen.join(', ')}`,
        brief.nutzer_antworten
          ? `Nutzer-Klarstellungen: ${JSON.stringify(brief.nutzer_antworten)}`
          : '',
      ].join('\n')
    : 'Kein Viz-Brief — Layout strikt beibehalten, nur Oberflächen/Material.'

  const userText = [
    kontext,
    briefCtx,
    `Wunsch (DE): ${input.wunschText}`,
    input.nachprompt ? `Zusatz: ${input.nachprompt}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: userText }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()

    if (!text) throw new Error('Render-Prompt konnte nicht erzeugt werden.')
    return text
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

/** @deprecated Alias für Abwärtskompatibilität */
export const buildEnglishRenderPrompt = buildRenderPrompt

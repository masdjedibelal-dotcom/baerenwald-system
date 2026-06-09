import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import type { VizRaumAnalyse } from '@/lib/visualize/types'

const SYSTEM = `Du übersetzt deutsche Renovierungswünsche in einen englischen Stable-Diffusion-Prompt
für ein Interior-Design-Inpainting-Modell (Raumlayout bleibt erhalten).
Antwort NUR mit dem englischen Prompt als Plain Text, ohne Anführungszeichen, max. 120 Wörter.
Fokus: Materialien, Farben, Licht, Stil — realistisch, keine Menschen, kein Text im Bild.`

export async function buildEnglishRenderPrompt(input: {
  wunschText: string
  raumAnalyse?: VizRaumAnalyse | null
}): Promise<string> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt.')

  const kontext = input.raumAnalyse
    ? `Raum: ${input.raumAnalyse.raum_label}. Ist: ${input.raumAnalyse.ist_beschreibung}`
    : 'Raum unbekannt'

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${kontext}\nWunsch (DE): ${input.wunschText.trim()}`,
        },
      ],
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

import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import {
  claudeApiKeyLooksValid,
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import { loadVizImageBase64ForClaude } from '@/lib/visualize/storage'

const SYSTEM = `Du analysierst Bild 1 (Ist-Raum) und Bild 2 (Stil-Referenz) für Bärenwald München.
Extrahiere aus Bild 2 nur Stil, Materialien, Farben und Atmosphäre — NICHT dessen Raumlayout.
Der Ist-Raum behält Geometrie, Fliesenhöhe, Fenster und Sanitärobjekte.
Formuliere einen deutschen Renovierungswunsch für den Ist-Raum.
Antwort NUR als JSON:
{
  "wunsch_entwurf": "2–5 Sätze auf Deutsch — was sich optisch ändern soll, ohne Layout zu verändern"
}`

async function imageBlock(url: string): Promise<Anthropic.ImageBlockParam> {
  const { mediaType, data } = await loadVizImageBase64ForClaude(url)
  return {
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data },
  }
}

export async function analyzeZielBildForPrompt(input: {
  ist_bild_url: string
  ziel_bild_url: string
  gewerk?: string | null
}): Promise<string> {
  const key = getClaudeApiKey()
  if (!key) {
    throw new Error('CLAUDE_API_KEY fehlt — in Netlify unter Environment Variables setzen.')
  }
  if (!claudeApiKeyLooksValid(key)) {
    throw new Error('CLAUDE_API_KEY hat ungültiges Format (erwartet sk-ant-… von console.anthropic.com).')
  }

  const gewerkHint = input.gewerk?.trim() ? `Gewerk/Kontext: ${input.gewerk.trim()}. ` : ''

  try {
    const client = createAnthropicClient(key)
    const [istBlock, zielBlock] = await Promise.all([
      imageBlock(input.ist_bild_url),
      imageBlock(input.ziel_bild_url),
    ])

    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${gewerkHint}Bild 1 = Ist-Raum. Bild 2 = Stil-Referenz (nur Material/Farbe übernehmen):`,
            },
            istBlock,
            zielBlock,
          ],
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    if (!text) throw new Error('Claude lieferte keinen Prompt')

    const parsed = extractJsonObject(text) as { wunsch_entwurf?: string }
    const wunsch = parsed.wunsch_entwurf?.trim()
    if (wunsch) return wunsch
    return text
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

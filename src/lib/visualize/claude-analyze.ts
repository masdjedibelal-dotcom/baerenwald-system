import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import {
  claudeApiKeyLooksValid,
  createAnthropicClient,
  getClaudeApiKey,
} from '@/lib/copilot/claude-api-key'
import { COPILOT_MODEL } from '@/lib/copilot/claude-tools'
import { loadVizImageBase64ForClaude } from '@/lib/visualize/storage'

const SYSTEM = `Du schreibst englische Stable-Diffusion-Prompts für Interior-Design-INPAINTING auf einem BESTEHENDEN Raumfoto.

REGELN (strikt):
1. Bild 1 = IST-Zustand. Geometrie ist heilig: Fliesenhöhe (auch nur halbe Wand), Fenster/Türen, Nischen, Raumform, Sanitärobjekt-Positionen dürfen sich NICHT ändern.
2. Bild 2 = nur STIL-Referenz. Extrahiere Material, Farbe, Fliesenmuster, Oberflächen, Lichtstimmung — NICHT deren Raumlayout.
3. Wenn Fliesen im IST nur teilweise hochgehen: Material/Farbe der Ziel-Fliesen NUR auf die bestehende geflieste Fläche legen — NICHT bis zur Decke verlängern.
4. Prompt: zuerst was unverändert bleibt, dann welche Materialien/Farben auf welche bestehenden Flächen angewendet werden.

Antworte NUR mit dem englischen Prompt (2–5 Sätze), kein JSON, keine Erklärung.`

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
  ist_hinweis?: string | null
}): Promise<string> {
  const key = getClaudeApiKey()
  if (!key) {
    throw new Error('CLAUDE_API_KEY fehlt — in Netlify unter Environment Variables setzen.')
  }
  if (!claudeApiKeyLooksValid(key)) {
    throw new Error('CLAUDE_API_KEY hat ungültiges Format (erwartet sk-ant-… von console.anthropic.com).')
  }

  const gewerkHint = input.gewerk?.trim()
    ? `Gewerk/Kontext: ${input.gewerk.trim()}. `
    : ''
  const istHint = input.ist_hinweis?.trim()
    ? `Vom Nutzer fixiert: ${input.ist_hinweis.trim()}. `
    : ''

  try {
    const client = createAnthropicClient(key)
    const [istBlock, zielBlock] = await Promise.all([
      imageBlock(input.ist_bild_url),
      imageBlock(input.ziel_bild_url),
    ])

    const response = await client.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${gewerkHint}${istHint}Bild 1 = IST (Geometrie beibehalten). Bild 2 = Ziel-Stil (nur Material/Farbe übernehmen):`,
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
    return text
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import {
  claudeApiKeyLooksValid,
  getClaudeApiKey,
} from '@/lib/copilot/claude-api-key'
import { COPILOT_MODEL } from '@/lib/copilot/claude-tools'
import { loadVizImageBase64ForClaude } from '@/lib/visualize/storage'

const SYSTEM = `Du bist ein Experten-Innenarchitekt.
Analysiere das Ziel-Bild und beschreibe den Stil, Materialien, Farben und Atmosphäre in einem präzisen englischen Prompt für ein Stable Diffusion Modell.
Behalte die Raumstruktur des Ist-Bilds bei.
Antworte NUR mit dem Prompt, kein weiterer Text.`

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

  const gewerkHint = input.gewerk?.trim()
    ? `Gewerk/Kontext: ${input.gewerk.trim()}. `
    : ''

  try {
    const client = new Anthropic({ apiKey: key })
    const [istBlock, zielBlock] = await Promise.all([
      imageBlock(input.ist_bild_url),
      imageBlock(input.ziel_bild_url),
    ])

    const response = await client.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${gewerkHint}Ist-Zustand (Raumstruktur beibehalten):` },
            istBlock,
            { type: 'text', text: 'Ziel-Stil (so soll es aussehen):' },
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

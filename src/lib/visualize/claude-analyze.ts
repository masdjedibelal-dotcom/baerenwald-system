import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { getClaudeApiKey } from '@/lib/copilot/claude-api-key'

const SYSTEM = `Du bist ein Experten-Innenarchitekt.
Analysiere das Ziel-Bild und beschreibe den Stil, Materialien, Farben und Atmosphäre in einem präzisen englischen Prompt für ein Stable Diffusion Modell.
Behalte die Raumstruktur des Ist-Bilds bei.
Antworte NUR mit dem Prompt, kein weiterer Text.`

function imageBlock(url: string): Anthropic.ImageBlockParam {
  return {
    type: 'image',
    source: { type: 'url', url },
  }
}

export async function analyzeZielBildForPrompt(input: {
  ist_bild_url: string
  ziel_bild_url: string
  gewerk?: string | null
}): Promise<string> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt')

  const gewerkHint = input.gewerk?.trim()
    ? `Gewerk/Kontext: ${input.gewerk.trim()}. `
    : ''

  const client = new Anthropic({ apiKey: key })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${gewerkHint}Ist-Zustand (Raumstruktur beibehalten):` },
          imageBlock(input.ist_bild_url),
          { type: 'text', text: 'Ziel-Stil (so soll es aussehen):' },
          imageBlock(input.ziel_bild_url),
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
}

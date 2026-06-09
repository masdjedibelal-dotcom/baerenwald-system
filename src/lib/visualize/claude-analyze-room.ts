import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import { loadVizImageBase64ForClaude } from '@/lib/visualize/storage'
import type { VizRaumAnalyse } from '@/lib/visualize/types'

const ROOM_SYSTEM = `Du analysierst ein Raumfoto für Bärenwald München (Handwerk/Renovierung als GU).
Erkenne Raumtyp, beschreibe den Ist-Zustand sachlich auf Deutsch.
Schlage 3 unterschiedliche Stil-Richtungen vor, passend zum erkannten Raum.
Formuliere einen ersten Visualisierungs-Wunsch als Entwurf.
Antwort NUR als JSON mit exakt diesen Feldern:
{
  "raum_typ": "bad|kueche|wohnzimmer|schlafzimmer|flur|sonstiges",
  "raum_label": "Anzeigename",
  "ist_beschreibung": "…",
  "erkannte_elemente": ["…"],
  "einschaetzung": "…",
  "stil_vorschlaege": [
    { "titel": "…", "kurz": "…", "prompt_de": "deutscher Visualisierungswunsch" }
  ],
  "wunsch_entwurf": "…"
}
Keine Preise erfinden.`

function validateAnalyse(raw: unknown): VizRaumAnalyse {
  const o = raw as Record<string, unknown>
  if (!o || typeof o !== 'object') throw new Error('Ungültige Raumanalyse.')
  const stil = Array.isArray(o.stil_vorschlaege) ? o.stil_vorschlaege : []
  return {
    raum_typ: String(o.raum_typ ?? 'sonstiges'),
    raum_label: String(o.raum_label ?? 'Raum'),
    ist_beschreibung: String(o.ist_beschreibung ?? ''),
    erkannte_elemente: Array.isArray(o.erkannte_elemente)
      ? o.erkannte_elemente.map(String)
      : undefined,
    einschaetzung: o.einschaetzung ? String(o.einschaetzung) : undefined,
    stil_vorschlaege: stil.slice(0, 3).map((s) => {
      const item = s as Record<string, unknown>
      return {
        titel: String(item.titel ?? ''),
        kurz: String(item.kurz ?? ''),
        prompt_de: String(item.prompt_de ?? ''),
      }
    }),
    wunsch_entwurf: String(o.wunsch_entwurf ?? ''),
  }
}

export async function analyzeRoomImage(storedUrl: string): Promise<VizRaumAnalyse> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt.')

  try {
    const { mediaType, data } = await loadVizImageBase64ForClaude(storedUrl)
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 1200,
      system: ROOM_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data },
            },
            { type: 'text', text: 'Analysiere dieses Raumfoto für eine Renovierungs-Visualisierung.' },
          ],
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')

    return validateAnalyse(extractJsonObject(text))
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

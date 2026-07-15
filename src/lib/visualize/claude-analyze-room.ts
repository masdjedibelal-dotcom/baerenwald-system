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
Erkenne Raumtyp, beschreibe den Ist-Zustand sachlich auf Deutsch (Du-Form).
Liste sichtbare bauliche Elemente, die beim Render erhalten bleiben sollten (Fenster, Türen, Grundriss).
Schlage 3 unterschiedliche Stil-Richtungen vor, passend zum erkannten Raum.
Formuliere einen ersten Visualisierungs-Wunsch als Entwurf — der Nutzer bearbeitet ihn.
Antwort NUR als JSON mit exakt diesen Feldern:
{
  "raum_typ": "bad|kueche|wohnzimmer|schlafzimmer|flur|sonstiges",
  "raum_label": "Anzeigename",
  "ist_beschreibung": "…",
  "erkannte_elemente": ["Fenster hinten", "…"],
  "fixierte_elemente": [
    { "id": "fenster_hinten", "label": "Fenster hinten", "preserve_default": true }
  ],
  "veraenderbare_flaechen": ["Wandfliesen", "Boden", "…"],
  "einschaetzung": "…",
  "stil_vorschlaege": [
    { "titel": "…", "kurz": "…", "prompt_de": "deutscher Visualisierungswunsch" }
  ],
  "wunsch_entwurf": "…"
}
Keine Preise erfinden. Keine Kontaktdaten erfragen.`

const INSPIRATION_SYSTEM = `Du analysierst ein Inspirations-/Mood-Bild für eine Renovierung (Bärenwald München).
Beschreibe Stil, Materialien, Farben und Atmosphäre auf Deutsch (Du-Form).
Formuliere daraus einen Visualisierungs-Wunsch, den der Nutzer auf seinen eigenen Raum anwenden kann.
Antwort NUR als JSON mit exakt diesen Feldern:
{
  "raum_typ": "inspiration",
  "raum_label": "Inspirationsbild",
  "ist_beschreibung": "Stil-Beschreibung des Inspirationsbildes …",
  "stil_vorschlaege": [
    { "titel": "…", "kurz": "…", "prompt_de": "deutscher Visualisierungswunsch" }
  ],
  "wunsch_entwurf": "…"
}
Keine Preise erfinden. Keine Kontaktdaten erfragen.`

function validateAnalyse(raw: unknown): VizRaumAnalyse {
  const o = raw as Record<string, unknown>
  if (!o || typeof o !== 'object') throw new Error('Ungültige Analyse.')
  const stil = Array.isArray(o.stil_vorschlaege) ? o.stil_vorschlaege : []
  const fixierte = Array.isArray(o.fixierte_elemente) ? o.fixierte_elemente : []
  return {
    raum_typ: String(o.raum_typ ?? 'sonstiges'),
    raum_label: String(o.raum_label ?? 'Raum'),
    ist_beschreibung: String(o.ist_beschreibung ?? ''),
    erkannte_elemente: Array.isArray(o.erkannte_elemente)
      ? o.erkannte_elemente.map(String)
      : undefined,
    fixierte_elemente: fixierte.slice(0, 8).map((item, i) => {
      const el = item as Record<string, unknown>
      return {
        id: String(el.id ?? `element_${i}`),
        label: String(el.label ?? ''),
        preserve_default: el.preserve_default !== false,
      }
    }),
    veraenderbare_flaechen: Array.isArray(o.veraenderbare_flaechen)
      ? o.veraenderbare_flaechen.map(String)
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

async function analyzeImageWithClaude(
  storedUrl: string,
  system: string,
  userText: string
): Promise<VizRaumAnalyse> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt.')

  const { mediaType, data } = await loadVizImageBase64ForClaude(storedUrl)
  const client = createAnthropicClient(key)
  const response = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: 1200,
    system,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          },
          { type: 'text', text: userText },
        ],
      },
    ],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')

  return validateAnalyse(extractJsonObject(text))
}

export async function analyzeRoomImage(storedUrl: string): Promise<VizRaumAnalyse> {
  try {
    return await analyzeImageWithClaude(
      storedUrl,
      ROOM_SYSTEM,
      'Analysiere dieses Raumfoto für eine Renovierungs-Visualisierung.'
    )
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

export async function analyzeInspirationImage(storedUrl: string): Promise<VizRaumAnalyse> {
  try {
    return await analyzeImageWithClaude(
      storedUrl,
      INSPIRATION_SYSTEM,
      'Leite daraus einen Renovierungs-Wunsch ab, den man auf den eigenen Raum übertragen kann.'
    )
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import type { VizBauErklaerung, VizRaumAnalyse } from '@/lib/visualize/types'

const SYSTEM = `Du bist Verkaufs- und Fachberater für Bärenwald — digitaler GU in München.
Nach einer Raum-Visualisierung erklärst du verkaufsorientiert, aber ehrlich, was für die Umsetzung nötig ist.

Antwort NUR als JSON:
{
  "titel": "Projekttitel",
  "chat_kurz": "2–3 Sätze",
  "zielbild_headline": "Kurze Headline fürs Zielbild",
  "zusammenfassung": "3–4 Sätze",
  "gewerke": [{ "name": "Gewerk", "beschreibung": "1 kurzer Satz" }],
  "ablauf": ["Schritt …"],
  "naechste_schritte": ["1. …", "2. …", "3. …"],
  "hinweis_gu": "1 Satz warum Bärenwald als GU sinnvoll ist",
  "cta_text": "Projekt kostenlos anfragen"
}

REGELN:
- Professionell, Sie-Form für Angebot/Kunde.
- Gewerke: 3–5 realistische Positionen.
- naechste_schritte: genau 3 Schritte.
- Keine erfundenen Preise.`

function validate(raw: unknown): VizBauErklaerung {
  const o = raw as Record<string, unknown>
  const gewerke = Array.isArray(o.gewerke) ? o.gewerke : []
  const ablauf = Array.isArray(o.ablauf) ? o.ablauf : []
  const schritte = Array.isArray(o.naechste_schritte) ? o.naechste_schritte : ablauf
  const titel = String(o.titel ?? 'So könnte Bärenwald Ihr Projekt umsetzen')
  const zusammenfassung = String(o.zusammenfassung ?? '')

  return {
    titel,
    chat_kurz: String(
      o.chat_kurz ??
        (zusammenfassung.slice(0, 280) ||
          'So könnte der Raum aussehen — wir begleiten Sie von der Idee bis zur Umsetzung.')
    ),
    zielbild_headline: String(o.zielbild_headline ?? titel),
    zusammenfassung,
    gewerke: gewerke.slice(0, 6).map((g) => {
      const item = g as Record<string, unknown>
      return {
        name: String(item.name ?? ''),
        beschreibung: String(item.beschreibung ?? ''),
      }
    }),
    ablauf: ablauf.map(String),
    naechste_schritte: schritte.slice(0, 3).map(String),
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu) : undefined,
    cta_text: String(o.cta_text ?? 'Projekt kostenlos anfragen'),
  }
}

export async function generateBauErklaerung(input: {
  wunschText: string
  raumAnalyse?: VizRaumAnalyse | null
}): Promise<VizBauErklaerung> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt.')

  const raum = input.raumAnalyse
    ? `${input.raumAnalyse.raum_label}: ${input.raumAnalyse.ist_beschreibung}`
    : 'Raum nicht analysiert'

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 1400,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Raum: ${raum}\nVisualisierungswunsch (intern, nicht zitieren): ${input.wunschText}`,
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')

    return validate(extractJsonObject(text))
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

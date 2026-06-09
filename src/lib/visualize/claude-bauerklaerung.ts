import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import type { VizBauErklaerung, VizRaumAnalyse } from '@/lib/visualize/types'

const SYSTEM = `Du bist Creative Copywriter und Fachberater für Bärenwald — digitaler GU in München.
Nach einer Raum-Visualisierung schreibst du Texte für ein share-taugliches Zielbild (Instagram/Pinterest Feed 4:5).

Antwort NUR als JSON:
{
  "titel": "Interner Projekttitel",
  "chat_kurz": "2–3 Sätze Du-Form für den Chat nach dem Bild — warm, konkret.",
  "zielbild_kicker": "2–4 Wörter, editorial, z. B. BADNEU · MÜNCHEN",
  "zielbild_headline": "Magazin-Headline, emotional, max. 7 Wörter",
  "zielbild_teaser": "Ein aspirativer Satz, max. 75 Zeichen",
  "zusammenfassung": "2–3 Sätze Du-Form fürs Zielbild: Was wird gemacht + wie das Vorhaben mit Bärenwald läuft. Keine Pills, fließende Prosa.",
  "gewerke": [{ "name": "Gewerk", "beschreibung": "max. 4 Wörter" }],
  "ablauf": ["Schritt …"],
  "naechste_schritte": ["Anfrage stellen", "Beratung vor Ort", "Umsetzung aus einer Hand"],
  "hinweis_gu": "Eleganter Micro-Satz, max. 55 Zeichen",
  "cta_text": "Projekt anfragen",
  "preis_hinweis_optional": "optional, keine Euro-Beträge"
}

ZIELBILD-COPY:
- zielbild_headline: bildhaft, editorial — nicht technisch.
- zusammenfassung: Satz 1 = Was wir für deinen Raum tun. Satz 2–3 = Wie Bärenwald als GU das begleitet.
- naechste_schritte: genau 3 kurze Schritte (je 2–4 Wörter), vertikal im Layout.
- cta_text: aktiv, z. B. „Projekt anfragen“
- Gewerke nur für internen Chat-Kontext, nicht als Liste fürs Bild.

REGELN:
- Du-Form, ehrlich — nie Kundenwunsch copy-pasten.
- KEINE Zeitangaben, keine Preise, keine URLs.
- Kein JSON außerhalb des Blocks.`

function validate(raw: unknown): VizBauErklaerung {
  const o = raw as Record<string, unknown>
  const gewerke = Array.isArray(o.gewerke) ? o.gewerke : []
  const ablauf = Array.isArray(o.ablauf) ? o.ablauf : []
  const schritte = Array.isArray(o.naechste_schritte) ? o.naechste_schritte : ablauf
  const titel = String(o.titel ?? 'So könnte Bärenwald dein Projekt umsetzen')
  const zusammenfassung = String(o.zusammenfassung ?? '')

  return {
    titel,
    chat_kurz: String(
      o.chat_kurz ??
        (zusammenfassung.slice(0, 280) ||
          'So könnte dein Raum aussehen — wir begleiten dich von der Idee bis zur Umsetzung.')
    ),
    zielbild_kicker: o.zielbild_kicker ? String(o.zielbild_kicker).slice(0, 48) : undefined,
    zielbild_headline: String(o.zielbild_headline ?? titel).slice(0, 80),
    zielbild_teaser: String(
      o.zielbild_teaser ??
        (zusammenfassung.split(/[.!?]/)[0]?.trim().slice(0, 90) ||
          'Dein Wunschraum — umgesetzt aus einer Hand.')
    ).slice(0, 100),
    zusammenfassung,
    gewerke: gewerke.slice(0, 6).map((g) => {
      const item = g as Record<string, unknown>
      return {
        name: String(item.name ?? ''),
        beschreibung: String(item.beschreibung ?? ''),
      }
    }),
    ablauf: ablauf.map(String),
    naechste_schritte: schritte
      .slice(0, 4)
      .map((s) => String(s).replace(/^\d+[.)]\s*/, '').trim()),
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu).slice(0, 70) : undefined,
    cta_text: String(o.cta_text ?? 'Anfragen').slice(0, 28),
    preis_hinweis_optional: o.preis_hinweis_optional
      ? String(o.preis_hinweis_optional)
      : undefined,
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
          content: `Raum: ${raum}\nVisualisierungswunsch (intern, nicht wörtlich zitieren): ${input.wunschText}\n\nSchreibe editorial-starke Zielbild-Texte passend zum Raum und Stil.`,
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

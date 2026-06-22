import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import type { LeadVertriebsKontext } from '@/lib/leads/lead-vertriebs-kontext'
import { leadVertriebsKontextAlsPrompt } from '@/lib/leads/lead-vertriebs-kontext'

export type LeadVertriebsAnalyse = {
  kurzfassung: string
  kundenprofil: string
  kaufsignale: string[]
  risiken: string[]
  gespraechstipps: string[]
  naechste_schritte: string[]
  verhalten: string
}

const SYSTEM = `Du bist Vertriebsberater für Bärenwald München (digitaler GU).
Du analysierst Website-Anfragen für das Innendienst-Team — keine Marketing-Texte, keine Zielbild-Copy.

Antwort NUR als JSON:
{
  "kurzfassung": "2–3 Sätze: Wer ist der Kunde, was will er, wie heiß ist das Projekt?",
  "kundenprofil": "1 kurzer Absatz: Motivation, Dringlichkeit, Entscheidungslage",
  "kaufsignale": ["konkretes Signal aus Chat/Logs", "…"],
  "risiken": ["Einwand oder Abbruch-Risiko", "…"],
  "gespraechstipps": ["Formulierung/Taktik fürs Telefon", "…"],
  "naechste_schritte": ["Erste Aktion für Mitarbeiter", "…"],
  "verhalten": "1 Absatz: Was hat der Kunde auf der Website getan (Chat, Eingaben, Visualisierung, Zögern)?"
}

REGELN:
- Deutsch, sachlich, handlungsorientiert.
- Nur aus den gelieferten Daten schließen — nichts erfinden.
- Gesprächstipps = konkret für den Erst-Anruf.
- naechste_schritte = max. 4 Punkte für den Mitarbeiter im CRM.
- Keine Preise versprechen, keine URLs.`

function validate(raw: unknown): LeadVertriebsAnalyse {
  const o = raw as Record<string, unknown>
  const arr = (v: unknown) =>
    (Array.isArray(v) ? v : [])
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)

  return {
    kurzfassung: String(o.kurzfassung ?? '').trim(),
    kundenprofil: String(o.kundenprofil ?? '').trim(),
    kaufsignale: arr(o.kaufsignale),
    risiken: arr(o.risiken),
    gespraechstipps: arr(o.gespraechstipps),
    naechste_schritte: arr(o.naechste_schritte),
    verhalten: String(o.verhalten ?? '').trim(),
  }
}

export function formatLeadVertriebsAnalyse(analyse: LeadVertriebsAnalyse): string {
  const lines: string[] = [analyse.kurzfassung, '']

  if (analyse.kundenprofil) {
    lines.push('**Kundenprofil**', analyse.kundenprofil, '')
  }
  if (analyse.verhalten) {
    lines.push('**Verhalten auf der Website**', analyse.verhalten, '')
  }
  if (analyse.kaufsignale.length) {
    lines.push('**Kaufsignale**', ...analyse.kaufsignale.map((s) => `- ${s}`), '')
  }
  if (analyse.risiken.length) {
    lines.push('**Risiken / Einwände**', ...analyse.risiken.map((s) => `- ${s}`), '')
  }
  if (analyse.gespraechstipps.length) {
    lines.push('**Gesprächstipps**', ...analyse.gespraechstipps.map((s) => `- ${s}`), '')
  }
  if (analyse.naechste_schritte.length) {
    lines.push('**Nächste Schritte**', ...analyse.naechste_schritte.map((s) => `- ${s}`), '')
  }

  return lines.join('\n').trim()
}

export async function generateLeadVertriebsAnalyse(
  kontext: LeadVertriebsKontext
): Promise<LeadVertriebsAnalyse> {
  const key = getClaudeApiKey()
  if (!key) {
    throw new Error('CLAUDE_API_KEY fehlt — Vertriebs-Analyse nicht möglich.')
  }

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 1800,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${leadVertriebsKontextAlsPrompt(kontext)}\n\nErstelle die Vertriebs-Analyse für den Mitarbeiter.`,
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

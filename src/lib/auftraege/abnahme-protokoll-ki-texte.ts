import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import {
  filterAbnahmePunkteFuerDokument,
  type AbnahmeMangel,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'

const SYSTEM = `Du formulierst kurze Kundentexte für ein Abnahmeprotokoll (Garten- und Landschaftsbau / Handwerk, Bärenwald München).

Antwort NUR als JSON:
{
  "leistungsumfang_kurz": "1–3 Sätze: was im vereinbarten Umfang ausgeführt / abgenommen wurde",
  "hinweis_sonstiges": "1–2 Sätze: sachlicher Hinweis zur gemeinsamen Begehung / Abnahme für den Kunden"
}

REGELN:
- Sie-Form, klar, seriös, ohne Marketing-Floskeln.
- Nur Fakten aus dem Kontext — nichts erfinden (keine Mengen, Daten, Normen, Preise).
- Keine Wiederholung der Mängelliste (die steht separat im Protokoll).
- Keine internen Notizen, keine Partner-Kritik.
- leistungsumfang_kurz: kompakt, kundenverständlich, aus den abgenommenen Leistungen.
- hinweis_sonstiges: neutraler Abschluss-/Begehungshinweis; bei offenen Mängeln kurz darauf verweisen, dass Hinweise im Protokoll vermerkt sind — ohne die Mängel selbst aufzuzählen.`

export type AbnahmeKiFreitexte = {
  leistungsumfang_kurz: string
  hinweis_sonstiges: string
}

function punkteKontext(punkte: AbnahmePunkt[]): string {
  const selected = filterAbnahmePunkteFuerDokument(punkte)
  if (!selected.length) return '(keine Leistungen ausgewählt)'
  return selected
    .slice(0, 40)
    .map((p) => {
      const name = p.leistung_name?.trim()
      const desc = p.beschreibung?.trim() || ''
      const status = p.status === 'mangel' ? ' [Mangel]' : ''
      return `- ${name ? `${name}: ` : ''}${desc}${status}`
    })
    .join('\n')
}

function maengelKontext(maengel: AbnahmeMangel[]): string {
  const offen = maengel.filter((m) => {
    const s = m.status ?? 'offen'
    return s === 'offen' || s === 'in_bearbeitung'
  })
  if (!offen.length) return '(keine offenen Mängel)'
  return offen
    .slice(0, 20)
    .map((m) => `- ${m.beschreibung.trim()}`)
    .join('\n')
}

function validate(raw: unknown): AbnahmeKiFreitexte {
  const o = (raw ?? {}) as Record<string, unknown>
  return {
    leistungsumfang_kurz: String(o.leistungsumfang_kurz ?? '').trim().slice(0, 800),
    hinweis_sonstiges: String(o.hinweis_sonstiges ?? '').trim().slice(0, 600),
  }
}

/**
 * Kundenseitige Freitexte fürs Abnahmeprotokoll (Leistungsumfang + Hinweis).
 * Bei fehlendem API-Key oder Fehler: leere Strings → Caller nutzt Defaults.
 */
export async function generateAbnahmeFreitexte(input: {
  auftragTitel: string
  projektbezeichnung?: string | null
  angebotLeistungsumfang?: string | null
  kundeName?: string | null
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen?: string | null
}): Promise<AbnahmeKiFreitexte> {
  const empty: AbnahmeKiFreitexte = { leistungsumfang_kurz: '', hinweis_sonstiges: '' }
  const key = getClaudeApiKey()
  if (!key) return empty

  const user = [
    `Auftrag: ${input.auftragTitel.trim() || '—'}`,
    input.projektbezeichnung?.trim()
      ? `Projektbezeichnung: ${input.projektbezeichnung.trim()}`
      : null,
    input.kundeName?.trim() ? `Kunde: ${input.kundeName.trim()}` : null,
    input.angebotLeistungsumfang?.trim()
      ? `Angebot / Leistungsumfang (Roh):\n${input.angebotLeistungsumfang.trim()}`
      : null,
    `Abgenommene / dokumentierte Leistungen:\n${punkteKontext(input.punkte)}`,
    `Offene Mängel:\n${maengelKontext(input.maengel)}`,
    input.notizen?.trim() ? `Notizen (intern/optional):\n${input.notizen.trim()}` : null,
    '',
    'Formuliere leistungsumfang_kurz und hinweis_sonstiges für das Kunden-PDF.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    })
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
    return validate(extractJsonObject(text))
  } catch (e) {
    console.warn('[generateAbnahmeFreitexte]', formatAnthropicError(e))
    return empty
  }
}

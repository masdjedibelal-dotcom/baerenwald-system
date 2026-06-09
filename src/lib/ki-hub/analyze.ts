import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { compressForClaude, loadKiHubData } from '@/lib/ki-hub/load-data'
import { loadEmpfehlungenFuerLauf } from '@/lib/ki-hub/queries'
import { ruleBasedEmpfehlungen } from '@/lib/ki-hub/rule-alerts'
import type {
  KiEmpfehlungInsert,
  KiEmpfehlungRow,
  KiHubAnalyzeResult,
  KiHubLoadPayload,
} from '@/lib/ki-hub/types'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SYSTEM = `Du bist der KI-Analyst von Bärenwald München — digitaler Generalunternehmer für Handwerk.

Analysiere die CRM- und Marketing-Daten und gib strukturierte Empfehlungen + fertigen Content zurück.

WICHTIG:
- Nicht nur empfehlen — fertigen Text (Mail, WhatsApp, Instagram-Caption) liefern wo sinnvoll
- Jede Empfehlung hat aktion_typ und aktion_payload (open_crm mit path, link mit url, copy, send_mail)
- Priorisiere nach Business-Impact
- Wenn Daten fehlen, ehrlich sagen und trotzdem mit CRM-Daten arbeiten
- Keine personenbezogenen Daten erfinden — nur aus den Daten
- Deutsch

Antworte NUR als gültiges JSON (kein Markdown):
{
  "kritisch": [{ "bereich": "anfragen|technik|...", "titel": "...", "beschreibung": "...", "sofortmassnahme": "...", "aktion_typ": "open_crm|link|copy|send_mail", "aktion_payload": {} }],
  "heute_tun": [{ "bereich": "...", "titel": "...", "beschreibung": "...", "content": { "typ": "mail|whatsapp|...", "text": "...", "betreff": "..." }, "aktion_typ": "...", "aktion_payload": {} }],
  "beobachten": [{ "bereich": "...", "titel": "...", "muster": "...", "daten_basis": "...", "empfehlung": "..." }],
  "gelernt": [{ "erkenntnis": "...", "daten_basis": "...", "konfidenz": "hoch|mittel|gering", "anwendung": "..." }],
  "marketing_content": [{ "trigger": "...", "plattform": "instagram|linkedin|whatsapp|reel_script", "text": "...", "bild_prompt": "...", "hashtags": [], "timing": "..." }]
}`

type ClaudeRaw = {
  kritisch?: Array<Record<string, unknown>>
  heute_tun?: Array<Record<string, unknown>>
  beobachten?: Array<Record<string, unknown>>
  gelernt?: Array<Record<string, unknown>>
  marketing_content?: Array<Record<string, unknown>>
}

function mapKritisch(row: Record<string, unknown>): KiEmpfehlungInsert {
  return {
    bereich: (String(row.bereich ?? 'technik')) as KiEmpfehlungInsert['bereich'],
    prioritaet: 'kritisch',
    titel: String(row.titel ?? 'Kritisch'),
    beschreibung: [row.beschreibung, row.sofortmassnahme].filter(Boolean).join(' — ') || undefined,
    aktion_typ: String(row.aktion_typ ?? 'copy'),
    aktion_payload: (row.aktion_payload as Record<string, unknown>) ?? {},
  }
}

function mapHeute(row: Record<string, unknown>): KiEmpfehlungInsert {
  return {
    bereich: (String(row.bereich ?? 'anfragen')) as KiEmpfehlungInsert['bereich'],
    prioritaet: 'hoch',
    titel: String(row.titel ?? 'Heute'),
    beschreibung: String(row.beschreibung ?? ''),
    content: (row.content as KiEmpfehlungInsert['content']) ?? null,
    aktion_typ: String(row.aktion_typ ?? 'open_crm'),
    aktion_payload: (row.aktion_payload as Record<string, unknown>) ?? {},
  }
}

function mapBeobachten(row: Record<string, unknown>): KiEmpfehlungInsert {
  return {
    bereich: (String(row.bereich ?? 'strategie')) as KiEmpfehlungInsert['bereich'],
    prioritaet: 'info',
    titel: String(row.titel ?? row.muster ?? 'Beobachtung'),
    beschreibung: [row.daten_basis, row.empfehlung].filter(Boolean).join(' — ') || undefined,
    daten_basis: row as Record<string, unknown>,
    aktion_typ: 'copy',
  }
}

function mapGelernt(row: Record<string, unknown>): KiEmpfehlungInsert {
  return {
    bereich: 'strategie',
    prioritaet: 'info',
    titel: String(row.erkenntnis ?? 'Erkenntnis'),
    beschreibung: [row.daten_basis, row.anwendung].filter(Boolean).join(' — ') || undefined,
    daten_basis: {
      konfidenz: row.konfidenz ?? 'mittel',
      ...row,
    },
    aktion_typ: 'copy',
  }
}

function mapMarketing(row: Record<string, unknown>): KiEmpfehlungInsert {
  return {
    bereich: 'marketing',
    prioritaet: 'mittel',
    titel: String(row.trigger ?? 'Marketing-Content'),
    beschreibung: String(row.timing ?? ''),
    content: {
      typ: String(row.plattform ?? 'instagram'),
      text: String(row.text ?? ''),
      bild_prompt: (row.bild_prompt as string) ?? null,
      hashtags: (row.hashtags as string[]) ?? null,
    },
    aktion_typ: row.bild_prompt ? 'generate_image' : 'copy',
    aktion_payload: { plattform: row.plattform },
  }
}

function parseClaudeJson(text: string): ClaudeRaw {
  const trimmed = text.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('Kein JSON in Claude-Antwort')
  return JSON.parse(trimmed.slice(start, end + 1)) as ClaudeRaw
}

function mergeRuleAndClaude(
  rules: KiEmpfehlungInsert[],
  claude: KiEmpfehlungInsert[]
): KiEmpfehlungInsert[] {
  const seen = new Set(rules.map((r) => r.titel.toLowerCase()))
  const merged = [...rules]
  for (const c of claude) {
    if (seen.has(c.titel.toLowerCase())) continue
    seen.add(c.titel.toLowerCase())
    merged.push(c)
  }
  return merged
}

async function callClaude(data: KiHubLoadPayload): Promise<ClaudeRaw> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt')

  const anthropic = createAnthropicClient(key)
  const compressed = compressForClaude(data)

  const userContent = `Analysiere diese Daten:\n${JSON.stringify(compressed, null, 0)}\n\nUmgesetzte Empfehlungen letzte 7 Tage:\n${JSON.stringify(data.umgesetzt_7d)}`

  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')

  return parseClaudeJson(text)
}

function toInserts(raw: ClaudeRaw): KiEmpfehlungInsert[] {
  return [
    ...(raw.kritisch ?? []).map(mapKritisch),
    ...(raw.heute_tun ?? []).map(mapHeute),
    ...(raw.beobachten ?? []).map(mapBeobachten),
    ...(raw.gelernt ?? []).map(mapGelernt),
    ...(raw.marketing_content ?? []).map(mapMarketing),
  ]
}

export async function runKiHubAnalyze(
  existingData?: KiHubLoadPayload
): Promise<{ ok: true; data: KiHubLoadPayload; empfehlungen: KiEmpfehlungRow[]; analyse_lauf: string } | { ok: false; message: string }> {
  try {
    const data = existingData ?? (await loadKiHubData())
    const analyseLauf = new Date().toISOString()

    const rules = ruleBasedEmpfehlungen(data)
    let claudeInserts: KiEmpfehlungInsert[] = []

    try {
      const raw = await callClaude(data)
      claudeInserts = toInserts(raw)
    } catch (e) {
      console.warn('[ki-hub] Claude-Analyse fehlgeschlagen, nur Regeln:', e)
    }

    const all = mergeRuleAndClaude(rules, claudeInserts)

    if (all.length === 0) {
      all.push({
        bereich: 'strategie',
        prioritaet: 'info',
        titel: 'Keine dringenden Maßnahmen erkannt',
        beschreibung: 'CRM-Daten sehen stabil aus. Cluster-Analysen für tiefere Insights aktualisieren.',
        aktion_typ: 'open_crm',
        aktion_payload: { anchor: 'ki-depth' },
      })
    }

    const rows = all.map((item) => ({
      bereich: item.bereich,
      prioritaet: item.prioritaet,
      titel: item.titel.slice(0, 500),
      beschreibung: item.beschreibung?.slice(0, 4000) ?? null,
      daten_basis: item.daten_basis ?? null,
      content: item.content ?? null,
      aktion_typ: item.aktion_typ ?? null,
      aktion_payload: item.aktion_payload ?? null,
      analyse_lauf: analyseLauf,
      gesehen: false,
      umgesetzt: false,
    }))

    const { error } = await supabaseAdmin.from('ki_empfehlungen').insert(rows)
    if (error) return { ok: false, message: error.message }

    const empfehlungen = await loadEmpfehlungenFuerLauf(analyseLauf)
    return { ok: true, data, empfehlungen, analyse_lauf: analyseLauf }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Analyse fehlgeschlagen',
    }
  }
}

export type { KiHubAnalyzeResult }

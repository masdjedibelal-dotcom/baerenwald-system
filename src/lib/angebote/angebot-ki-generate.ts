import 'server-only'

import { randomUUID } from 'crypto'
import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import { resolvePositionMatch } from '@/lib/angebote/angebot-ki-match'
import {
  dominantGewerkSlug,
  formatBeispieleForPrompt,
  loadAngebotKiBeispiele,
} from '@/lib/angebote/angebot-ki-lernen'
import {
  buildKiKontextMitMeta,
  KI_META_BESCHREIBUNG_ID,
  KI_META_TITEL_ID,
  type AngebotKiErgebnis,
  type AngebotKiGenerateInput,
  type AngebotKiPositionRolle,
  type AngebotKiPositionVorschlag,
} from '@/lib/angebote/angebot-ki-types'

const SYSTEM = `Du bist Dokument-Assistent für Bärenwald München (Angebot & Rechnung).
Alles ist eine Position — auch Titel und Beschreibung. Keine separaten Felder.

Nutzer-Prompts sind oft konkret („Bad 8 m² Fliesen Mittelklasse“) — daraus realistische Positionen mit Mengen, Einheiten und klaren Leistungsbeschreibungen ableiten. Keine Marketing-Floskeln.

ANTWORT NUR als JSON:
{
  "positionen": [
    {
      "rolle": "titel|beschreibung|leistung",
      "leistung": "Kurztitel (bei titel/beschreibung: der Text selbst)",
      "beschreibung": "bei leistung: Leistungsbeschreibung; bei titel/beschreibung oft leer oder Detail",
      "menge": 1,
      "einheit": "Stk.|pauschal|m²|lfm|Std.|—",
      "preis_netto": 0,
      "gewerk_slug": "bad|elektro|…",
      "gewerk_name": "Bad",
      "match_hint": {
        "kind": "vorhanden_wizard|preisliste|neu",
        "ref_id": "id aus Kontext oder leer",
        "confidence": 0.0
      }
    }
  ],
  "hinweis": "optional kurzer Hinweis"
}

ROLLEN:
- rolle "titel": Dokument-/Projekttitel. match auf id "${KI_META_TITEL_ID}". menge=1, einheit="—", preis_netto=0. Text in "leistung".
- rolle "beschreibung": Projekt-/Dokumentbeschreibung. match auf id "${KI_META_BESCHREIBUNG_ID}". menge=1, einheit="—", preis_netto=0. Langer Text in "beschreibung" (oder leistung wenn kurz).
- rolle "leistung": echte Kalkulationsposition.

MATCH:
- Titel/Beschreibung: immer vorhanden_wizard mit der Meta-ID, wenn schon Text existiert — sonst neu.
- Leistung: vorhandene Wizard-Position → vorhanden_wizard + id; Preisliste → preisliste + id; sonst neu.
- Keine Doppelungen: inhaltlich gleiche Leistungen updaten statt neu.

PREISE nur bei rolle "leistung". Titel/Beschreibung ohne Preis.
Stil: konkret, ohne Marketing-Floskeln, keine URLs, keine erfundenen Normen.`

function parseRolle(raw: unknown): AngebotKiPositionRolle {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'titel' || s === 'title') return 'titel'
  if (s === 'beschreibung' || s === 'description') return 'beschreibung'
  return 'leistung'
}

function validateErgebnis(
  raw: unknown,
  input: AngebotKiGenerateInput,
  kontext: ReturnType<typeof buildKiKontextMitMeta>
): AngebotKiErgebnis {
  const o = (raw ?? {}) as Record<string, unknown>
  let rawPos = Array.isArray(o.positionen) ? o.positionen : []

  // Legacy: getrennte titel/beschreibung-Felder → als Positionen
  if (o.titel != null && String(o.titel).trim()) {
    rawPos = [
      {
        rolle: 'titel',
        leistung: String(o.titel).trim(),
        beschreibung: '',
        menge: 1,
        einheit: '—',
        preis_netto: 0,
        match_hint: { kind: 'vorhanden_wizard', ref_id: KI_META_TITEL_ID, confidence: 1 },
      },
      ...rawPos,
    ]
  }
  if (o.beschreibung != null && String(o.beschreibung).trim()) {
    rawPos = [
      {
        rolle: 'beschreibung',
        leistung: 'Beschreibung',
        beschreibung: String(o.beschreibung).trim(),
        menge: 1,
        einheit: '—',
        preis_netto: 0,
        match_hint: {
          kind: 'vorhanden_wizard',
          ref_id: KI_META_BESCHREIBUNG_ID,
          confidence: 1,
        },
      },
      ...rawPos,
    ]
  }

  const leistungenOnly = kontext.filter((p) => (p.rolle ?? 'leistung') === 'leistung')
  const seenMeta = new Set<AngebotKiPositionRolle>()

  const positionen: AngebotKiPositionVorschlag[] = rawPos.slice(0, 42).map((row) => {
    const r = row as Record<string, unknown>
    const rolle = parseRolle(r.rolle)
    const hint = (r.match_hint ?? r.match) as Record<string, unknown> | undefined
    let leistung = String(r.leistung ?? r.titel ?? 'Leistung').trim() || 'Leistung'
    let beschreibung = String(r.beschreibung ?? '').trim()

    if (rolle === 'titel') {
      if (!leistung && beschreibung) leistung = beschreibung
      beschreibung = ''
    }
    if (rolle === 'beschreibung') {
      if (!beschreibung && leistung && leistung !== 'Beschreibung') {
        beschreibung = leistung
        leistung = 'Beschreibung'
      }
    }

    if (rolle === 'titel' || rolle === 'beschreibung') {
      const metaId = rolle === 'titel' ? KI_META_TITEL_ID : KI_META_BESCHREIBUNG_ID
      const existing = kontext.find((p) => p.id === metaId)
      const hasContent = Boolean(existing?.beschreibung?.trim() || existing?.leistung?.trim())
      seenMeta.add(rolle)
      return {
        id: randomUUID(),
        rolle,
        leistung: rolle === 'titel' ? leistung : leistung || 'Beschreibung',
        beschreibung: rolle === 'beschreibung' ? beschreibung : '',
        menge: 1,
        einheit: '—',
        preis_netto: 0,
        gewerk_slug: null,
        gewerk_name: null,
        match: {
          kind: hasContent ? 'vorhanden_wizard' : 'neu',
          ref_id: metaId,
          label: rolle === 'titel' ? 'Titel' : 'Beschreibung',
          confidence: 1,
        },
        anwenden: true,
      }
    }

    const draft = {
      leistung,
      beschreibung,
      menge: Math.max(0.01, Number(r.menge) || 1),
      einheit: String(r.einheit ?? 'Stk.').trim() || 'Stk.',
      preis_netto: Math.max(0, Number(r.preis_netto ?? r.preis) || 0),
      gewerk_slug: r.gewerk_slug ? String(r.gewerk_slug) : null,
      gewerk_name: r.gewerk_name ? String(r.gewerk_name) : null,
      match: hint
        ? {
            kind: String(hint.kind || 'neu') as 'vorhanden_wizard' | 'preisliste' | 'neu',
            ref_id: hint.ref_id ? String(hint.ref_id) : null,
            label: hint.label ? String(hint.label) : null,
            confidence: Number(hint.confidence) || 0,
          }
        : undefined,
    }

    // Meta-IDs nicht als Leistungs-Match
    if (
      draft.match?.ref_id === KI_META_TITEL_ID ||
      draft.match?.ref_id === KI_META_BESCHREIBUNG_ID
    ) {
      draft.match = undefined
    }

    const match = resolvePositionMatch(draft, leistungenOnly, input.preislisten)
    let preis = draft.preis_netto
    if (match.kind === 'preisliste' && match.ref_id) {
      const pl = input.preislisten.find((p) => p.id === match.ref_id)
      if (pl && (preis <= 0 || Math.abs(preis - pl.preis_min) / Math.max(pl.preis_min, 1) > 0.5)) {
        preis = pl.preis_min
      }
    }

    return {
      id: randomUUID(),
      rolle: 'leistung' as const,
      leistung,
      beschreibung,
      menge: draft.menge,
      einheit: draft.einheit,
      preis_netto: preis,
      gewerk_slug: draft.gewerk_slug,
      gewerk_name: draft.gewerk_name,
      match,
      anwenden: true,
    }
  })

  // Max. eine Titel- und eine Beschreibungs-Position
  const deduped: AngebotKiPositionVorschlag[] = []
  const metaDone = new Set<AngebotKiPositionRolle>()
  for (const p of positionen) {
    if (p.rolle === 'titel' || p.rolle === 'beschreibung') {
      if (metaDone.has(p.rolle)) continue
      metaDone.add(p.rolle)
    }
    deduped.push(p)
  }
  void seenMeta

  return {
    positionen: deduped,
    hinweis: o.hinweis != null ? String(o.hinweis).trim() || null : null,
  }
}

export async function generateAngebotKi(
  input: AngebotKiGenerateInput
): Promise<AngebotKiErgebnis> {
  const key = getClaudeApiKey()
  if (!key) throw new Error('CLAUDE_API_KEY fehlt — bitte in der Umgebung setzen.')

  const kontext = buildKiKontextMitMeta({
    titel: input.titel,
    beschreibung: input.beschreibung,
    positionen: input.positionen,
  })

  const gewerk = dominantGewerkSlug({ ...input, positionen: kontext, scope: 'positionen' })
  const beispiele = await loadAngebotKiBeispiele({
    scope: 'positionen',
    gewerk_slug: gewerk,
    limit: 5,
  })
  const learn = formatBeispieleForPrompt(beispiele)

  const existingJson = JSON.stringify(
    kontext.map((p) => ({
      id: p.id,
      rolle: p.rolle ?? 'leistung',
      leistung: p.leistung,
      beschreibung: p.beschreibung.slice(0, 280),
      preis_netto: p.preis_netto,
      gewerk_slug: p.gewerk_slug,
      preisliste_id: p.preisliste_id,
    })),
    null,
    0
  ).slice(0, 7000)

  const preisJson = JSON.stringify(
    input.preislisten.slice(0, 80).map((p) => ({
      id: p.id,
      leistung: p.leistung,
      einheit: p.einheit,
      preis_min: p.preis_min,
      gewerk_slug: p.gewerk_slug,
    })),
    null,
    0
  ).slice(0, 8000)

  const userMsg = [
    'Scope: positionen (Titel & Beschreibung sind Positionen mit rolle titel|beschreibung).',
    input.leadKurz ? `Kontext: ${input.leadKurz}` : null,
    `Gewerke: ${input.gewerke.map((g) => `${g.slug}=${g.name}`).join(', ')}`,
    `EXISTIERENDE Positionen (inkl. Meta-Titel/Beschreibung):\n${existingJson}`,
    `PREISLISTE:\n${preisJson}`,
    `Nutzer-Prompt:\n${input.prompt.trim()}`,
    learn || null,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 3500,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')

    return validateErgebnis(extractJsonObject(text), input, kontext)
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

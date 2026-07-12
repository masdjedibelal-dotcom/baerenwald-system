import 'server-only'

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from '@/lib/copilot/claude-api-key'
import { formatAnthropicError } from '@/lib/copilot/format-anthropic-error'
import { extractJsonObject } from '@/lib/visualize/claude-json'
import type {
  VizBrief,
  VizModus,
  VizPrepareQuestion,
  VizRaumAnalyse,
} from '@/lib/visualize/types'

const SYSTEM = `Du bereitest eine Renovierungs-Visualisierung für Bärenwald München vor.
Vergleiche Ist-Raumbild, optional Inspirationsbild und Nutzerwunsch.
Stelle nur Fragen, die für ein realistisches Render wirklich nötig sind (max. 3 insgesamt).
Wenn Ist und Inspiration stark abweichen (z. B. Fenster nur im Inspiration, anderer Grundriss), MUSS eine Rückfrage kommen.

Antwort NUR als JSON:
{
  "modus": "auffrischen|teilsanierung|stil_update",
  "struktur_lock": true,
  "preserve": ["Fenster hinten", "…"],
  "aenderungen": ["Wandfliesen", "…"],
  "questions": [
    {
      "id": "einzigartige_id",
      "question": "Frage an den Nutzer auf Deutsch (Du)",
      "hint": "optional, kurz",
      "options": [
        { "id": "opt_a", "label": "Kurze Antwort", "hint": "optional" }
      ]
    }
  ]
}

modus:
- auffrischen = nur Material/Farbe/Oberflächen
- teilsanierung = + Sanitär, Armaturen, Licht
- stil_update = stärkerer Look, aber ohne Grundrissänderung wenn struktur_lock

questions: leeres Array wenn keine Unklarheiten. Jede Frage 2–4 Optionen.
Keine Preise. Keine Kontaktdaten.`

export type VizPrepareResult = {
  ready: boolean
  viz_brief: VizBrief
  questions: VizPrepareQuestion[]
}

function defaultPreserve(ist?: VizRaumAnalyse | null): string[] {
  const fromFix = ist?.fixierte_elemente
    ?.filter((e) => e.preserve_default)
    .map((e) => e.label)
    .filter(Boolean)
  if (fromFix?.length) return fromFix
  return (ist?.erkannte_elemente ?? []).slice(0, 6)
}

function defaultAenderungen(ist?: VizRaumAnalyse | null): string[] {
  if (ist?.veraenderbare_flaechen?.length) return ist.veraenderbare_flaechen.slice(0, 5)
  return ['Wandoberflächen', 'Boden/Fliesen', 'Beleuchtung']
}

function validateModus(raw: unknown): VizModus {
  const v = String(raw ?? 'auffrischen')
  if (v === 'teilsanierung' || v === 'stil_update') return v
  return 'auffrischen'
}

function validateQuestions(raw: unknown): VizPrepareQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 3)
    .map((q) => {
      const item = q as Record<string, unknown>
      const options = Array.isArray(item.options) ? item.options : []
      return {
        id: String(item.id ?? `q_${Math.random().toString(36).slice(2, 8)}`),
        question: String(item.question ?? ''),
        hint: item.hint ? String(item.hint) : undefined,
        options: options.slice(0, 4).map((o) => {
          const opt = o as Record<string, unknown>
          return {
            id: String(opt.id ?? 'opt'),
            label: String(opt.label ?? ''),
            hint: opt.hint ? String(opt.hint) : undefined,
          }
        }),
      }
    })
    .filter((q) => q.question && q.options.length >= 2)
}

export function mergeVizBriefAnswer(
  brief: VizBrief,
  questionId: string,
  optionId: string,
  optionLabel: string
): VizBrief {
  const beantwortet = brief.beantwortete_fragen.includes(questionId)
    ? brief.beantwortete_fragen
    : [...brief.beantwortete_fragen, questionId]

  const antworten = { ...(brief.nutzer_antworten ?? {}), [questionId]: optionLabel }

  let modus = brief.modus
  let struktur_lock = brief.struktur_lock
  const preserve = [...brief.preserve]
  const aenderungen = [...brief.aenderungen]

  if (questionId.includes('modus') || questionId.includes('umfang')) {
    if (optionId.includes('auffrischen')) modus = 'auffrischen'
    else if (optionId.includes('teil')) modus = 'teilsanierung'
    else if (optionId.includes('stil')) modus = 'stil_update'
  }
  if (questionId.includes('fenster') || questionId.includes('struktur')) {
    if (optionId.includes('behalten') || optionId.includes('weg') || optionId.includes('kein')) {
      struktur_lock = true
      if (!preserve.some((p) => /fenster/i.test(p))) preserve.push('Keine neuen Fenster')
    }
    if (optionId.includes('inspiration') || optionId.includes('stimmung')) {
      struktur_lock = true
    }
    if (optionId.includes('bau') || optionId.includes('echt')) {
      struktur_lock = false
    }
  }
  if (questionId.includes('inspiration') && optionId.includes('nur_material')) {
    modus = 'auffrischen'
    struktur_lock = true
  }

  return {
    modus,
    struktur_lock,
    preserve: Array.from(new Set(preserve)),
    aenderungen: Array.from(new Set(aenderungen)),
    beantwortete_fragen: beantwortet,
    nutzer_antworten: antworten,
  }
}

export function fallbackVizBrief(ist?: VizRaumAnalyse | null): VizBrief {
  return {
    modus: 'auffrischen',
    struktur_lock: true,
    preserve: defaultPreserve(ist),
    aenderungen: defaultAenderungen(ist),
    beantwortete_fragen: [],
  }
}

export async function prepareVizRender(input: {
  wunschText: string
  istAnalyse?: VizRaumAnalyse | null
  inspirationAnalyse?: VizRaumAnalyse | null
  existingBrief?: VizBrief | null
}): Promise<VizPrepareResult> {
  const existing = input.existingBrief ?? fallbackVizBrief(input.istAnalyse)

  const key = getClaudeApiKey()
  if (!key) {
    return { ready: true, viz_brief: existing, questions: [] }
  }

  const istCtx = input.istAnalyse
    ? `Ist-Raum (${input.istAnalyse.raum_label}): ${input.istAnalyse.ist_beschreibung}\nElemente: ${(input.istAnalyse.erkannte_elemente ?? []).join(', ')}`
    : 'Ist-Raum: nicht analysiert'
  const zielCtx = input.inspirationAnalyse
    ? `Inspiration: ${input.inspirationAnalyse.ist_beschreibung}\nElemente: ${(input.inspirationAnalyse.erkannte_elemente ?? []).join(', ')}`
    : 'Kein Inspirationsbild'
  const beantwortet = existing.beantwortete_fragen.length
    ? `Bereits beantwortet: ${JSON.stringify(existing.nutzer_antworten ?? {})}`
    : 'Noch keine Antworten'

  try {
    const client = createAnthropicClient(key)
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${istCtx}\n${zielCtx}\nWunsch: ${input.wunschText}\n${beantwortet}\n\nErzeuge Brief und nur noch offene Fragen (keine bereits beantworteten IDs wiederholen).`,
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')

    const raw = extractJsonObject(text) as Record<string, unknown>
    const allQuestions = validateQuestions(raw.questions).filter(
      (q) => !existing.beantwortete_fragen.includes(q.id)
    )

    const viz_brief: VizBrief = {
      modus: validateModus(raw.modus) ?? existing.modus,
      struktur_lock: raw.struktur_lock !== false,
      preserve:
        Array.isArray(raw.preserve) && raw.preserve.length
          ? raw.preserve.map(String)
          : existing.preserve.length
            ? existing.preserve
            : defaultPreserve(input.istAnalyse),
      aenderungen:
        Array.isArray(raw.aenderungen) && raw.aenderungen.length
          ? raw.aenderungen.map(String)
          : existing.aenderungen.length
            ? existing.aenderungen
            : defaultAenderungen(input.istAnalyse),
      beantwortete_fragen: existing.beantwortete_fragen,
      nutzer_antworten: existing.nutzer_antworten,
    }

    const questions = allQuestions.slice(0, 3 - existing.beantwortete_fragen.length)
    return {
      ready: questions.length === 0,
      viz_brief,
      questions,
    }
  } catch (e) {
    throw new Error(formatAnthropicError(e))
  }
}

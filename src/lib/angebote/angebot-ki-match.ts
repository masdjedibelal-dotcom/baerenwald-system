import type {
  AngebotKiKontextPosition,
  AngebotKiKontextPreisliste,
  AngebotKiMatchKind,
  AngebotKiPositionVorschlag,
} from '@/lib/angebote/angebot-ki-types'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((t) => t.length > 2))
}

/** Jaccard-ähnlich + Substring-Bonus */
export function textSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of Array.from(ta)) if (tb.has(t)) inter++
  const union = ta.size + tb.size - inter
  return union > 0 ? inter / union : 0
}

type MatchHit = {
  kind: AngebotKiMatchKind
  ref_id: string
  label: string
  confidence: number
}

export function matchPositionAgainstCatalog(input: {
  leistung: string
  beschreibung: string
  existing: AngebotKiKontextPosition[]
  preislisten: AngebotKiKontextPreisliste[]
}): MatchHit {
  const query = `${input.leistung} ${input.beschreibung}`.trim()
  let best: MatchHit = { kind: 'neu', ref_id: '', label: 'Neue Position', confidence: 0 }

  for (const p of input.existing) {
    const score = Math.max(
      textSimilarity(query, p.leistung),
      textSimilarity(query, `${p.leistung} ${p.beschreibung}`),
      textSimilarity(input.leistung, p.leistung)
    )
    if (score > best.confidence) {
      best = {
        kind: 'vorhanden_wizard',
        ref_id: p.id,
        label: p.leistung,
        confidence: score,
      }
    }
  }

  for (const pl of input.preislisten) {
    const score = Math.max(
      textSimilarity(query, pl.leistung),
      textSimilarity(input.leistung, pl.leistung)
    )
    // Preisliste nur wenn besser als Wizard-Treffer oder Wizard schwach
    if (
      score > best.confidence ||
      (best.kind === 'vorhanden_wizard' && best.confidence < 0.55 && score >= 0.55)
    ) {
      if (score >= 0.45) {
        best = {
          kind: 'preisliste',
          ref_id: pl.id,
          label: pl.leistung,
          confidence: score,
        }
      }
    }
  }

  if (best.confidence < 0.45) {
    return { kind: 'neu', ref_id: '', label: 'Neue Position', confidence: best.confidence }
  }
  return best
}

/** Claude-Vorschlag mit serverseitigem Match überschreiben/absichern. */
export function resolvePositionMatch(
  vorschlag: Omit<AngebotKiPositionVorschlag, 'match' | 'anwenden' | 'id' | 'rolle'> & {
    id?: string
    rolle?: AngebotKiPositionVorschlag['rolle']
    match?: AngebotKiPositionVorschlag['match']
  },
  existing: AngebotKiKontextPosition[],
  preislisten: AngebotKiKontextPreisliste[]
): AngebotKiPositionVorschlag['match'] {
  const auto = matchPositionAgainstCatalog({
    leistung: vorschlag.leistung,
    beschreibung: vorschlag.beschreibung,
    existing,
    preislisten,
  })

  const hinted = vorschlag.match
  if (
    hinted?.kind &&
    hinted.kind !== 'neu' &&
    hinted.ref_id &&
    (hinted.kind === 'vorhanden_wizard'
      ? existing.some((e) => e.id === hinted.ref_id)
      : preislisten.some((p) => p.id === hinted.ref_id))
  ) {
    const conf = Math.max(Number(hinted.confidence) || 0, auto.confidence)
    if (conf >= 0.4) {
      return {
        kind: hinted.kind,
        ref_id: hinted.ref_id,
        label: hinted.label ?? auto.label,
        confidence: conf,
      }
    }
  }

  return {
    kind: auto.kind,
    ref_id: auto.ref_id || null,
    label: auto.label,
    confidence: auto.confidence,
  }
}

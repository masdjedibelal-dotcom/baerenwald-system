export type HandwerkerBewertungKategorieKey =
  | 'qualitaet'
  | 'termintreue'
  | 'sauberkeit'
  | 'kommunikation'
  | 'preis_leistung'

export type HandwerkerBewertungWerte = Record<HandwerkerBewertungKategorieKey, number>

export const HANDWERKER_BEWERTUNG_KATEGORIEN: {
  key: HandwerkerBewertungKategorieKey
  label: string
  hint: string
}[] = [
  {
    key: 'qualitaet',
    label: 'Qualität der Arbeit',
    hint: 'Fachliche Ausführung, Ergebnis, Nacharbeit',
  },
  {
    key: 'termintreue',
    label: 'Termintreue',
    hint: 'Pünktlichkeit, Zuverlässigkeit bei Terminen',
  },
  {
    key: 'sauberkeit',
    label: 'Sauberkeit & Ordnung',
    hint: 'Baustelle, Entsorgung, Rücksicht auf Umgebung',
  },
  {
    key: 'kommunikation',
    label: 'Kommunikation',
    hint: 'Erreichbarkeit, Rückmeldungen, Abstimmung',
  },
  {
    key: 'preis_leistung',
    label: 'Preis-Leistung',
    hint: 'Verhältnis von Kosten und Ergebnis',
  },
]

export function leereHandwerkerBewertung(): HandwerkerBewertungWerte {
  return {
    qualitaet: 0,
    termintreue: 0,
    sauberkeit: 0,
    kommunikation: 0,
    preis_leistung: 0,
  }
}

export function istHandwerkerBewertungVollstaendig(w: HandwerkerBewertungWerte): boolean {
  return HANDWERKER_BEWERTUNG_KATEGORIEN.every((k) => w[k.key] >= 1 && w[k.key] <= 5)
}

export function durchschnittAusBewertung(w: HandwerkerBewertungWerte): number {
  const vals = HANDWERKER_BEWERTUNG_KATEGORIEN.map((k) => w[k.key]).filter((n) => n >= 1)
  if (!vals.length) return 0
  const sum = vals.reduce((a, b) => a + b, 0)
  return Math.round((sum / vals.length) * 10) / 10
}

export function formatHandwerkerBewertung(note: number | null | undefined): string {
  const n = typeof note === 'number' && Number.isFinite(note) ? note : 0
  const clamped = Math.min(5, Math.max(0, n))
  return clamped.toLocaleString('de-DE', {
    minimumFractionDigits: clamped % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

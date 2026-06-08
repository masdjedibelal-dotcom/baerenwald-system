export const KI_BEREICHE = {
  funnel: 'Gesamt-Funnel',
  nachfrage: 'Nachfrage & Rechner',
  kommunikation: 'Kommunikation & Nachrichten',
  angebot_abgleich: 'Anfrage → Angebot',
  preise_margen: 'Preise & Margen',
  produkte: 'Standardpakete & Kombinationen',
  gewerke: 'Auftragsablauf je Gewerk',
  ausfuehrung: 'Ausführung Eigen & Fremd',
  handwerker: 'Handwerker Routing',
  dauer: 'Baustelle & Abnahme',
  bewertungen: 'Handwerker-Bewertungen',
} as const

export type KiBereich = keyof typeof KI_BEREICHE

/** Reihenfolge + Refresh-Keys (Client + Server) */
export const KI_BEREICH_ORDER: KiBereich[] = [
  'funnel',
  'nachfrage',
  'kommunikation',
  'angebot_abgleich',
  'preise_margen',
  'produkte',
  'gewerke',
  'ausfuehrung',
  'handwerker',
  'dauer',
  'bewertungen',
]

export type KiPhase = {
  id: string
  label: string
  journeyLabel: string
  bereiche: KiBereich[]
}

/** Lifecycle-Phasen für UI-Gruppierung */
export const KI_PHASEN: KiPhase[] = [
  {
    id: 'nachfrage',
    label: '① Nachfrage',
    journeyLabel: 'Anfrage',
    bereiche: ['funnel', 'nachfrage', 'kommunikation'],
  },
  {
    id: 'angebot',
    label: '② Angebot',
    journeyLabel: 'Angebot',
    bereiche: ['angebot_abgleich', 'preise_margen', 'produkte', 'gewerke'],
  },
  {
    id: 'ausfuehrung',
    label: '③ Ausführung',
    journeyLabel: 'Ausführung',
    bereiche: ['ausfuehrung', 'handwerker'],
  },
  {
    id: 'baustelle',
    label: '④ Baustelle',
    journeyLabel: 'Baustelle',
    bereiche: ['dauer'],
  },
  {
    id: 'qualitaet',
    label: '⑤ Qualität',
    journeyLabel: 'Bewertung',
    bereiche: ['bewertungen'],
  },
]

export const KI_MIN_SAMPLE_DEFAULT = 10
export const KI_MIN_SAMPLE_GEWERK = 3
export const KI_THIN_SAMPLE = 3

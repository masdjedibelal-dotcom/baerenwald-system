export const KI_BEREICHE = {
  preise_margen: 'Preise & Margen',
  produkte: 'Standardpakete & Kombinationen',
  gewerke: 'Auftragsablauf je Gewerk',
  handwerker: 'Handwerker Routing',
  kundentypen: 'Kundentypen',
  dauer: 'Dauer & Planung',
  risiken: 'Probleme & Risiken',
  bewertungen: 'Bewertungen',
} as const

export type KiBereich = keyof typeof KI_BEREICHE

export const KI_MIN_SAMPLE_DEFAULT = 10
export const KI_MIN_SAMPLE_GEWERK = 3

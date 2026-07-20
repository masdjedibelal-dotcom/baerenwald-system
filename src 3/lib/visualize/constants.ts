export const VIZ_STORAGE_BUCKET = 'visualisierungen'

/** Max. Ist-Fotos pro Session */
export const VIZ_MAX_IST_BILDER = 3

/** Weiche Kostenbremse pro Session */
export const VIZ_MAX_RENDERS_PER_SESSION = 15

export const REPLICATE_INTERIOR_MODEL_VERSION =
  '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38'

export const VIZ_STIL_TAGS = [
  'Modern',
  'Klassisch',
  'Skandinavisch',
  'Mediterran',
  'Industrial',
  'Minimalistisch',
] as const

export const VIZ_NACHPROMPT_TAGS = [
  'Fliesen heller',
  'Mehr Licht',
  'Wärmer',
  'Minimalistischer',
  'Mehr Holz',
  'Heller (nur Farben)',
  'Näher am Original',
] as const

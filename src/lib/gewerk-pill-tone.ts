export const GEWERK_PILL_TONES = [
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'gray',
  'gold',
] as const

export type GewerkPillTone = (typeof GEWERK_PILL_TONES)[number]

function normGewerkKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

const GEWERK_PILL_BY_KEY: Record<string, GewerkPillTone> = {
  sanitaer: 'blue',
  wasser: 'blue',
  bad: 'blue',
  heizung: 'orange',
  heiz: 'orange',
  elektrik: 'yellow',
  elektro: 'yellow',
  fliesen: 'gray',
  maler: 'gold',
  wand: 'gold',
  boden: 'orange',
  dach: 'red',
  garten: 'green',
  fenster: 'blue',
  fassade: 'gray',
  trockenbau: 'gray',
  schreiner: 'orange',
  tischler: 'orange',
}

function hashTone(key: string): GewerkPillTone {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  const i = Math.abs(h) % GEWERK_PILL_TONES.length
  return GEWERK_PILL_TONES[i]!
}

/** Stabile Pill-Farbe je Gewerk-Name oder -Slug. */
export function gewerkPillTone(label: string): GewerkPillTone {
  const key = normGewerkKey(label)
  if (!key) return 'gray'
  for (const [k, tone] of Object.entries(GEWERK_PILL_BY_KEY)) {
    if (key.includes(k) || k.includes(key)) return tone
  }
  return hashTone(key)
}

export function gewerkPillClass(label: string): string {
  return `pill-tag gw-${gewerkPillTone(label)}`
}

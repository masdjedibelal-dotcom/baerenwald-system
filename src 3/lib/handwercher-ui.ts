/** Anzeige-Gruppe für Filter-Chips (nicht zwingend identisch mit DB-Wert subkategorie). */
export const HANDWERKER_SUBKATEGORIE_GRUPPEN = [
  '',
  'Sanitär & Heizung',
  'Elektro',
  'Dach',
  'Lüftung',
  'Bau & Ausbau',
  'Schreiner',
  'Fenster',
  'Sonstige',
] as const

export type HandwerkerSubGruppe = (typeof HANDWERKER_SUBKATEGORIE_GRUPPEN)[number]

export function handwerkerSubGruppe(subkategorie: string | null | undefined): Exclude<HandwerkerSubGruppe, ''> {
  const s = (subkategorie ?? '').toLowerCase()
  if (!s) return 'Sonstige'
  if (s.includes('sanit') || s.includes('heiz') || s.includes('abwasser')) return 'Sanitär & Heizung'
  if (s.includes('elektro')) return 'Elektro'
  if (s.includes('dach') || s.includes('spengl')) return 'Dach'
  if (s.includes('lüft') || s.includes('spezial')) return 'Lüftung'
  if (s.includes('bau') || s.includes('ausbau') || s.includes('abbruch') || s.includes('erdarbeit')) {
    return 'Bau & Ausbau'
  }
  if (s.includes('schrein') || s.includes('innen')) return 'Schreiner'
  if (s.includes('fenster') || s.includes('außenbau')) return 'Fenster'
  if (s.includes('metall')) return 'Bau & Ausbau'
  return 'Sonstige'
}

export const HANDWERKER_SUBKATEGORIE_FORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'Sanitär / Heizung / Abwasser', label: 'Sanitär / Heizung / Abwasser' },
  { value: 'Elektrotechnik', label: 'Elektrotechnik' },
  { value: 'Dach / Spenglerei', label: 'Dach / Spenglerei' },
  { value: 'Lüftung / Spezialtechnik', label: 'Lüftung / Spezialtechnik' },
  { value: 'Bau / Ausbau', label: 'Bau / Ausbau' },
  { value: 'Schreiner / Innenausbau', label: 'Schreiner / Innenausbau' },
  { value: 'Metall', label: 'Metall' },
  { value: 'Fenster / Außenbau', label: 'Fenster / Außenbau' },
  { value: 'Erdarbeiten / Abbruch', label: 'Erdarbeiten / Abbruch' },
  { value: 'Sonstiges', label: 'Sonstiges' },
]

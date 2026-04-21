/** Select-Wert für Freitext-Einheit im Modal */
export const EINHEIT_CUSTOM = '__custom__'

/** Feste Einheiten (Reihenfolge = Dropdown) */
export const EINHEIT_VORSCHLAEGE = [
  'pauschal',
  'pro m²',
  'pro m² Wandfläche',
  'pro Stück',
  'pro lfd. m',
  'pro Punkt',
  'pro Besuch',
  'pro Monat',
  'pro Saison',
  'pro m²/Monat',
  'Stunden',
] as const

/** @deprecated Nutze EINHEIT_CUSTOM */
export const EINHEIT_SONSTIGES = EINHEIT_CUSTOM

export function einheitSelectOptions(): { value: string; label: string }[] {
  return [
    ...EINHEIT_VORSCHLAEGE.map((e) => ({ value: e, label: e })),
    { value: EINHEIT_CUSTOM, label: 'Eigene Einheit…' },
  ]
}

export function resolveEinheitwahl(wahl: string, freitext: string): string {
  if (wahl === EINHEIT_CUSTOM) return freitext.trim()
  return wahl.trim()
}

export function splitEinheitStored(einheit: string): { wahl: string; freitext: string } {
  const known = [...EINHEIT_VORSCHLAEGE] as string[]
  if (known.includes(einheit)) return { wahl: einheit, freitext: '' }
  return { wahl: EINHEIT_CUSTOM, freitext: einheit }
}

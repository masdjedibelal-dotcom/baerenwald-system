/** Feste Einheiten + Kennzeichen für Freitext-Modus im Modal */
export const EINHEIT_SONSTIGES = '__sonstiges__'

export const EINHEIT_VORSCHLAEGE: { value: string; label: string }[] = [
  { value: 'pauschal', label: 'pauschal' },
  { value: 'pro m²', label: 'pro m²' },
  { value: 'pro m² Wandfläche', label: 'pro m² Wandfläche' },
  { value: 'pro Stück', label: 'pro Stück' },
  { value: 'pro lfd. m', label: 'pro lfd. m' },
  { value: 'pro Besuch', label: 'pro Besuch' },
  { value: 'pro Monat', label: 'pro Monat' },
  { value: 'pro Saison', label: 'pro Saison' },
  { value: 'pro Punkt', label: 'pro Punkt' },
  { value: 'pro m²/Monat', label: 'pro m²/Monat' },
  { value: EINHEIT_SONSTIGES, label: 'Sonstiges (Freitext)' },
]

export function resolveEinheitwahl(wahl: string, freitext: string): string {
  if (wahl === EINHEIT_SONSTIGES) return freitext.trim()
  return wahl.trim()
}

export function splitEinheitStored(einheit: string): { wahl: string; freitext: string } {
  const known = EINHEIT_VORSCHLAEGE.filter((x) => x.value !== EINHEIT_SONSTIGES).map((x) => x.value)
  if (known.includes(einheit)) return { wahl: einheit, freitext: '' }
  return { wahl: EINHEIT_SONSTIGES, freitext: einheit }
}

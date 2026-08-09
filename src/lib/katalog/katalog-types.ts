/** Preiskatalog Position + Variante (neue Struktur). */

export const KATALOG_KATEGORIEN = [
  'Reparatur',
  'Erneuerung',
  'Wartung',
  'Komplettsanierung',
  'Teilleistung',
  'Laufende Leistung',
  'Nebenleistung',
  'Entsorgung',
  'Baumarbeiten',
  'Verlegen',
  'Aufbereitung',
  'Abbruch',
  'Innen',
  'Außen',
  'Wände',
  'Decken',
  'Sonstiges',
] as const
export type KatalogKategorie = (typeof KATALOG_KATEGORIEN)[number]

export const KATALOG_EINHEITEN = [
  'm²',
  'lfd. m',
  'm³',
  'Stück',
  'Stunde',
  'pauschal',
  'Monat',
  'Saison',
  'Besuch',
  'm²/Monat',
  'm²/Saison',
] as const
export type KatalogEinheit = (typeof KATALOG_EINHEITEN)[number]

export type KatalogVariante = {
  id: string
  position_id: string
  variante: string
  beschreibung: string
  einheit: string
  preis_typ: 'fix' | 'ab' | string
  preis: number
  aktiv: boolean
  sortierung: number
}

export type KatalogPosition = {
  id: string
  gewerk_id: string
  titel: string
  kategorie: string
  beschreibung_standard: string
  aktiv: boolean
  sortierung: number
  gewerk_name?: string | null
  gewerk_slug?: string | null
  varianten: KatalogVariante[]
}

export type AngebotPositionQuelle = 'katalog' | 'frei'

export function katalogVarianteLabel(v: KatalogVariante): string {
  const name = v.variante?.trim()
  return name || 'Standard'
}

export function katalogPreisLabel(v: KatalogVariante): string {
  const n = Number(v.preis) || 0
  const formatted = n.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const prefix = v.preis_typ === 'ab' ? 'ab ' : ''
  return `${prefix}${formatted} €`
}

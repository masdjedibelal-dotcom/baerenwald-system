import { formatNumber } from '@/lib/format/geld-datum'

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

export function katalogVarianteLabel(v: KatalogVariante): string {
  const name = v.variante?.trim()
  return name || 'Standard'
}

export function katalogPreisLabel(v: KatalogVariante): string {
  const n = Number(v.preis) || 0
  const formatted = formatNumber(n, { minDecimals: 0, maxDecimals: 2 })
  const prefix = v.preis_typ === 'ab' ? 'ab ' : ''
  return `${prefix}${formatted} €`
}

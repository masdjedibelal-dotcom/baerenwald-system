import type { ObjektKontaktRolle } from '@/lib/objektakte/types'

export const OBJEKT_KONTAKT_ROLLEN: ObjektKontaktRolle[] = [
  'hausmeister',
  'beirat',
  'dienstleister',
  'notfall',
  'sonstiges',
]

export const OBJEKT_KONTAKT_ROLLE_LABELS: Record<ObjektKontaktRolle, string> = {
  hausmeister: 'Hausmeister',
  beirat: 'Beirat',
  dienstleister: 'Dienstleister',
  notfall: 'Notfall',
  sonstiges: 'Sonstiges',
}

export const OBJEKT_DOKUMENT_KATEGORIE_LABELS: Record<string, string> = {
  versicherung: 'Versicherung',
  vertrag: 'Vertrag',
  protokoll: 'Protokoll',
  grundbuch: 'Grundbuch',
  sonstiges: 'Sonstiges',
}

export const FREMD_VORGANG_KATEGORIE_LABELS: Record<string, string> = {
  sonstiges: 'Sonstiges',
}

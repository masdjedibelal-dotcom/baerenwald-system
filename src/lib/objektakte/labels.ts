import type { ObjektKontaktRolle } from '@/lib/objektakte/types'

export const OBJEKT_KONTAKT_ROLLEN: ObjektKontaktRolle[] = [
  'hausmeister',
  'ansprechpartner',
  'beirat',
  'dienstleister',
  'notfall',
  'sonstiges',
]

export const OBJEKT_KONTAKT_ROLLE_LABELS: Record<ObjektKontaktRolle, string> = {
  hausmeister: 'Hausmeister',
  ansprechpartner: 'Ansprechpartner',
  beirat: 'Beirat',
  dienstleister: 'Dienstleister',
  notfall: 'Notfall',
  sonstiges: 'Sonstiges',
}

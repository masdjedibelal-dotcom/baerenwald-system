import type {
  EinheitBewohnerRolle,
  ObjektAnlageStatus,
  ObjektKontaktRolle,
} from '@/lib/objektakte/types'

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

export const EINHEIT_BEWOHNER_ROLLEN: EinheitBewohnerRolle[] = ['eigentuemer', 'mieter']

export const EINHEIT_BEWOHNER_ROLLE_LABELS: Record<EinheitBewohnerRolle, string> = {
  eigentuemer: 'Eigentümer',
  mieter: 'Mieter',
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

export const OBJEKT_ANLAGE_STATUS: ObjektAnlageStatus[] = [
  'aktiv',
  'ausgetauscht',
  'stillgelegt',
]

export const OBJEKT_ANLAGE_STATUS_LABELS: Record<ObjektAnlageStatus, string> = {
  aktiv: 'Aktiv',
  ausgetauscht: 'Ausgetauscht',
  stillgelegt: 'Stillgelegt',
}

export const OBJEKT_ANLAGE_STATUS_BADGE: Record<ObjektAnlageStatus, string> = {
  aktiv: 'aktiv',
  ausgetauscht: 'warn',
  stillgelegt: 'plain',
}

export const OBJEKT_ANLAGE_WARTUNGSINTERVALL = [
  'keins',
  'monatlich',
  'quartalsweise',
  'halbjaehrlich',
  'jaehrlich',
] as const

export type ObjektAnlageWartungsintervall = (typeof OBJEKT_ANLAGE_WARTUNGSINTERVALL)[number]

export const OBJEKT_ANLAGE_WARTUNGSINTERVALL_LABELS: Record<
  ObjektAnlageWartungsintervall,
  string
> = {
  keins: 'Keins',
  monatlich: 'Monatlich',
  quartalsweise: 'Quartalsweise',
  halbjaehrlich: 'Halbjährlich',
  jaehrlich: 'Jährlich',
}

/** Kurzhinweis für Picker / Vorgang-Zuordnung — nur Anzeige. */
export function formatAnlageGarantieHint(
  garantieBis: string | null | undefined
): string | null {
  const raw = garantieBis?.trim()?.slice(0, 10)
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const label = d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })
  return `Garantie bis ${label}`
}

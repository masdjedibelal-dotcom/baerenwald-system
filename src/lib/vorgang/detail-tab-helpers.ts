/** Shared Akte-Segment + Alias-Helpers für Vorgang-Detail-Tabs. */

export type AkteSegment = 'zahlung' | 'dateien' | 'kunde'

export function parseAkteSegment(
  rawTab: string | null | undefined,
  segment: string | null | undefined
): AkteSegment {
  const s = (segment ?? '').trim().toLowerCase()
  if (s === 'dateien' || s === 'dokumente' || s === 'notizen') return 'dateien'
  if (s === 'kunde' || s === 'stammdaten') return 'kunde'
  if (s === 'zahlung' || s === 'finanzen' || s === 'zahlplan') return 'zahlung'
  const tab = (rawTab ?? '').trim().toLowerCase()
  if (
    tab === 'dokumente' ||
    tab === 'notizen' ||
    tab === 'fotos' ||
    tab === 'bilder' ||
    tab === 'photos' ||
    tab === 'kommunikation'
  ) {
    return 'dateien'
  }
  if (
    tab === 'stammdaten' ||
    tab === 'schritte' ||
    tab === 'naechste-schritte' ||
    tab === 'naechste_schritte'
  ) {
    return 'kunde'
  }
  return 'zahlung'
}

export function isLegacyDetailTabAlias(raw: string | null | undefined): boolean {
  const tab = (raw ?? '').trim().toLowerCase()
  return [
    'finanzen',
    'zahlplan',
    'zahlung',
    'dokumente',
    'notizen',
    'stammdaten',
    'fotos',
    'historie',
    'projektinfos',
    'details',
    'leistung',
    'leistungen',
    'positionen',
    'verlauf',
    'schritte',
    'auftragdetails',
  ].includes(tab)
}

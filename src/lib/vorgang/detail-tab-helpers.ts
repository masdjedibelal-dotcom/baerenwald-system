/** Shared Alias-Helpers für Vorgang-Detail-Tabs (Akte-Segmente entfallen seit Phase 5d). */

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

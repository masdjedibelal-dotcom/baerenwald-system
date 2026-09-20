/** Gemeinsame Such-Typen CRM (N1). */

export type SearchGroupId =
  | 'vorgaenge'
  | 'kunden'
  | 'objekte'
  | 'partner'
  | 'dokumente'
  | 'navigation'

export const SEARCH_GROUP_LABELS: Record<SearchGroupId, string> = {
  vorgaenge: 'Vorgänge',
  kunden: 'Kunden',
  objekte: 'Objekte',
  partner: 'Partner',
  dokumente: 'Dokumente',
  navigation: 'Navigation',
}

export type AppSearchHit = {
  id: string
  group: SearchGroupId
  icon: string
  label: string
  /** z. B. Nummer + Phase („ANG-12 · Angebot“) */
  sub?: string
  href: string
}

export type AppSearchResponse = {
  hits: AppSearchHit[]
}

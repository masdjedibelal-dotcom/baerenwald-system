/** Zentrale Pfade für revalidatePath in Server Actions. */

export const CRM_PATHS = {
  dashboard: '/',
  anfragen: '/anfragen',
  anfrage: (id: string) => `/anfragen/${id}`,
  angebote: '/angebote',
  angebot: (id: string) => `/angebote/${id}`,
  auftraege: '/auftraege',
  auftrag: (id: string) => `/auftraege/${id}`,
  rechnungen: '/rechnungen',
  rechnung: (id: string) => `/rechnungen/${id}`,
  kunden: '/kunden',
  kunde: (id: string) => `/kunden/${id}`,
  kalender: '/kalender',
} as const

/** Typische Kombination nach Lead-Mutation. */
export function anfrageRevalidatePaths(leadId: string): string[] {
  return [CRM_PATHS.anfragen, CRM_PATHS.anfrage(leadId), CRM_PATHS.dashboard]
}

/** Typische Kombination nach Angebot-Mutation. */
export function angebotRevalidatePaths(angebotId: string, leadId?: string | null): string[] {
  const paths = [CRM_PATHS.angebote, CRM_PATHS.angebot(angebotId)]
  if (leadId) paths.push(CRM_PATHS.anfrage(leadId))
  return paths
}

/** Typische Kombination nach Auftrag-Mutation. */
export function auftragRevalidatePaths(auftragId: string): string[] {
  return [CRM_PATHS.auftraege, CRM_PATHS.auftrag(auftragId), CRM_PATHS.dashboard]
}

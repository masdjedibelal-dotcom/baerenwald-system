/**
 * Nach einer Aktion (Server Action oder API-Aufruf) die Seite an den echten Stand binden.
 * Früher nur ein lokaler Zähler — nach API-Aufrufen (z. B. Angebot senden) blieb die Seite
 * dann veraltet („Entwurf“ obwohl gesendet). Jetzt lädt die Seitenhülle die Daten neu.
 */
export const CRM_REFRESH_EVENT = 'crm-refresh'

export function afterServerActionRefresh(bump?: () => void): void {
  bump?.()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CRM_REFRESH_EVENT))
}

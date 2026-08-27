/**
 * Kanonischer PDF-Endpunkt für Rechnungen/Gutschriften im CRM-UI.
 * FIX-01/07: eine Route — `/api/rechnungen/{id}/pdf` (id-Route, serverseitig mit Service-Role).
 */
export function rechnungPdfHref(rechnungId: string, storedPdfUrl?: string | null): string {
  const stored = storedPdfUrl?.trim()
  if (stored && stored.startsWith('http')) return stored
  const id = rechnungId?.trim()
  if (!id) return '/api/rechnungen'
  return `/api/rechnungen/${encodeURIComponent(id)}/pdf`
}

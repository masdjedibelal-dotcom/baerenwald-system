import { redirect } from 'next/navigation'

/** Entfernt aus Einstellungen-Nav — Integrationen / Erweiterungen. */
export default function EinstellungenIntegrationRedirect() {
  redirect('/einstellungen/firma')
}

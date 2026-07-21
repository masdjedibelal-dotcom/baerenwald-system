import { redirect } from 'next/navigation'

/** Entfernt aus Einstellungen-Nav (Mock: nur bis Formulare). */
export default function EinstellungenEmailRedirect() {
  redirect('/einstellungen/firma')
}

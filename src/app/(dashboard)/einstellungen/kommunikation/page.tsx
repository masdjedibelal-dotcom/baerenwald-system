import { redirect } from 'next/navigation'

/** Entfernt aus Einstellungen-Nav. */
export default function EinstellungenKommunikationRedirect() {
  redirect('/einstellungen/firma')
}

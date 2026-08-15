import { redirect } from 'next/navigation'

/** Formulare-UI in Einstellungen ausgeblendet — Baustellen-Formulare laufen weiter im Hintergrund. */
export default function EinstellungenFormulareRedirectPage() {
  redirect('/einstellungen/firma')
}

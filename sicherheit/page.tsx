import { redirect } from 'next/navigation'

/** Entfernt aus Einstellungen-Nav — Sicherheit & DSGVO. */
export default function EinstellungenSicherheitRedirect() {
  redirect('/einstellungen/firma')
}

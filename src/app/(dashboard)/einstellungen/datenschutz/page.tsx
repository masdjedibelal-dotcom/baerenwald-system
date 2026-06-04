import { redirect } from 'next/navigation'

export default function EinstellungenDatenschutzRedirectPage() {
  redirect('/einstellungen/integration?section=datenschutz')
}

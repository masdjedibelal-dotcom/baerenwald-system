import { redirect } from 'next/navigation'

export default function EinstellungenFelderRedirectPage() {
  redirect('/einstellungen/integration?section=felder')
}

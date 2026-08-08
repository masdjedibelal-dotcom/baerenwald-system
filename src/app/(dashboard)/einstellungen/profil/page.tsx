import { redirect } from 'next/navigation'

/** Legacy: altes „Mein Profil“ → Firma-Stammdaten. */
export default function EinstellungenProfilPage() {
  redirect('/einstellungen/firma')
}

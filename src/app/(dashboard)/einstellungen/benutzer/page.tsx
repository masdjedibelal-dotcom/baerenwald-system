import type { Metadata } from 'next'
import { BenutzerEinstellungenClient } from '@/components/einstellungen/BenutzerEinstellungenClient'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export const metadata: Metadata = {
  title: 'Team',
}

export default async function EinstellungenBenutzerPage() {
  const initial = await loadBenutzerListe()
  return <BenutzerEinstellungenClient initial={initial} />
}

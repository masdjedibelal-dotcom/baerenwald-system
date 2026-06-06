import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { BenutzerEinstellungenClient } from '@/components/einstellungen/BenutzerEinstellungenClient'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export const metadata: Metadata = {
  title: 'Benutzer',
}

export default async function EinstellungenBenutzerPage() {
  const initial = await loadBenutzerListe()
  return (
    <div>
      <PageHeader description="Team-Zugänge einladen und verwalten. Dein eigenes Profil findest du unter Tab „Profil“." />
      <BenutzerEinstellungenClient initial={initial} />
    </div>
  )
}

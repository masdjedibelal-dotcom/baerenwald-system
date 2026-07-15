import type { Metadata } from 'next'
import { BenutzerEinstellungenClient } from '@/components/einstellungen/BenutzerEinstellungenClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export const metadata: Metadata = {
  title: 'Benutzer',
}

export default async function EinstellungenBenutzerPage() {
  const initial = await loadBenutzerListe()
  return (
    <div>
      <EinstellungenMeta className="mb-4">Team-Zugänge einladen und verwalten. Dein eigenes Profil findest du unter Tab „Profil“.</EinstellungenMeta>
      <BenutzerEinstellungenClient initial={initial} />
    </div>
  )
}

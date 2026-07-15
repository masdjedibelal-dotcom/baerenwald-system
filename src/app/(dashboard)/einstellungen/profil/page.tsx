import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MeinProfilClient } from '@/components/einstellungen/MeinProfilClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
import { loadMeinProfil } from '@/app/(dashboard)/einstellungen/profil/actions'

export const metadata: Metadata = {
  title: 'Profil',
}

export default async function EinstellungenProfilPage() {
  const profil = await loadMeinProfil()
  if (!profil) redirect('/login')

  return (
    <div>
      <EinstellungenMeta className="mb-4">Dein Name und deine Kontaktdaten im CRM und Kundenportal.</EinstellungenMeta>
      <MeinProfilClient initial={profil} />
    </div>
  )
}

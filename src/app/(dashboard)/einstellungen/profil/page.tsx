import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { MeinProfilClient } from '@/components/einstellungen/MeinProfilClient'
import { loadMeinProfil } from '@/app/(dashboard)/einstellungen/profil/actions'

export const metadata: Metadata = {
  title: 'Profil',
}

export default async function EinstellungenProfilPage() {
  const profil = await loadMeinProfil()
  if (!profil) redirect('/login')

  return (
    <div>
      <PageHeader description="Dein Name und deine Kontaktdaten im CRM und Kundenportal." />
      <MeinProfilClient initial={profil} />
    </div>
  )
}

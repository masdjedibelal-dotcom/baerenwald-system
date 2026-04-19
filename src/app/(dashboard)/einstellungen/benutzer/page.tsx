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
      <PageHeader
        title="Benutzer"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Benutzer' },
        ]}
        description="Team-Zugänge und Einladungen (Supabase Auth)."
      />
      <BenutzerEinstellungenClient initial={initial} />
    </div>
  )
}

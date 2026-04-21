import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { FirmaBrandingForm } from '@/components/einstellungen/FirmaBrandingForm'
import { loadEinstellungenForm } from '@/app/(dashboard)/einstellungen/actions'

export const metadata: Metadata = {
  title: 'Firma & Branding',
}

export default async function EinstellungenFirmaPage() {
  const initial = await loadEinstellungenForm()
  return (
    <div>
      <PageHeader
        title="Firma & Branding"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'Firma & Branding' },
        ]}
        description="Erscheint auf PDFs und in der Kundenkommunikation."
      />
      <FirmaBrandingForm initial={initial} />
    </div>
  )
}

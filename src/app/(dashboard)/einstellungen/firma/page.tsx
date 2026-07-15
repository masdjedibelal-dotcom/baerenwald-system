import type { Metadata } from 'next'
import { FirmaBrandingForm } from '@/components/einstellungen/FirmaBrandingForm'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
import { loadEinstellungenForm } from '@/app/(dashboard)/einstellungen/actions'

export const metadata: Metadata = {
  title: 'Firma & Branding',
}

export default async function EinstellungenFirmaPage() {
  const initial = await loadEinstellungenForm()
  return (
    <div>
      <EinstellungenMeta className="mb-4">Erscheint auf PDFs und in der Kundenkommunikation.</EinstellungenMeta>
      <FirmaBrandingForm initial={initial} />
    </div>
  )
}

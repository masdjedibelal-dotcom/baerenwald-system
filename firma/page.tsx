import type { Metadata } from 'next'
import { FirmaBrandingForm } from '@/components/einstellungen/FirmaBrandingForm'
import { loadEinstellungenForm } from '@/app/(dashboard)/einstellungen/actions'

export const metadata: Metadata = {
  title: 'Firma',
}

export default async function EinstellungenFirmaPage() {
  const initial = await loadEinstellungenForm()
  return <FirmaBrandingForm initial={initial} />
}

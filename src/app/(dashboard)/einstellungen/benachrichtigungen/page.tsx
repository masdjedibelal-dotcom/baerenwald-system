import type { Metadata } from 'next'
import { EinstellungenBenachrichtigungenClient } from '@/components/einstellungen/EinstellungenBenachrichtigungenClient'

export const metadata: Metadata = {
  title: 'Benachrichtigungen',
}

export default function EinstellungenBenachrichtigungenPage() {
  return <EinstellungenBenachrichtigungenClient />
}

import type { Metadata } from 'next'
import { EinstellungenBenachrichtigungenCard } from '@/components/einstellungen/EinstellungenMockToggles'

export const metadata: Metadata = {
  title: 'Benachrichtigungen',
}

export default function EinstellungenKommunikationPage() {
  return <EinstellungenBenachrichtigungenCard />
}

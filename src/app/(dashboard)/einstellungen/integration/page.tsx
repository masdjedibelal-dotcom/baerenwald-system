import type { Metadata } from 'next'
import { EinstellungenIntegrationenMock } from '@/components/einstellungen/EinstellungenIntegrationenMock'

export const metadata: Metadata = {
  title: 'Integrationen',
}

export default function EinstellungenIntegrationPage() {
  return <EinstellungenIntegrationenMock />
}

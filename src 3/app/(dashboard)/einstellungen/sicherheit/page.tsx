import type { Metadata } from 'next'
import { EinstellungenSicherheitClient } from '@/components/einstellungen/EinstellungenSicherheitClient'

export const metadata: Metadata = {
  title: 'Sicherheit & DSGVO',
}

export default function EinstellungenSicherheitPage() {
  return <EinstellungenSicherheitClient />
}

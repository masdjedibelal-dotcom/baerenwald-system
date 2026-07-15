import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Anfragen',
}

export default function AnfragenPage() {
  redirect('/vorgaenge?phase=anfrage')
}

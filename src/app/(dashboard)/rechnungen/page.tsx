import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Rechnungen',
}

/** Positivliste: Phasen-Listen laufen über Vorgänge (Phase-Filter). */
export default function RechnungenPage() {
  redirect('/vorgaenge?tab=rechnung')
}

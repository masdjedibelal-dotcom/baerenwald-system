import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Angebote',
}

/** Positivliste: Phasen-Listen laufen über Vorgänge (Phase-Filter). */
export default function AngebotePage() {
  redirect('/vorgaenge?tab=angebot')
}

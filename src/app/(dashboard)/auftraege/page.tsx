import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Aufträge',
}

/** Positivliste: Phasen-Listen laufen über Vorgänge (Phase-Filter). */
export default function AuftraegePage() {
  redirect('/vorgaenge?tab=auftrag')
}

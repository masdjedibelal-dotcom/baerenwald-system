import type { KalenderTermin } from '@/lib/types'
import { istEchterKalenderTermin } from '@/lib/kalender-styles'

/** Nur echte Termine in der Anfrage-Terminliste. */
export function istLeadTerminAnzeige(termin: KalenderTermin): boolean {
  return istEchterKalenderTermin(termin)
}

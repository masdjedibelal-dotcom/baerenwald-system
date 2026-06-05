import type { KalenderTermin } from '@/lib/types'

/** CRM-internes To-do — erscheint im Dashboard, nicht in der Anfrage-Terminliste. */
export function istLeadTerminAnzeige(termin: KalenderTermin): boolean {
  if (termin.typ === 'intern') return false
  const titel = termin.titel?.trim() ?? ''
  if (titel.startsWith('Nachfassen:')) return false
  return true
}

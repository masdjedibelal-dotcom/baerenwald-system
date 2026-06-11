import type { KalenderTermin } from '@/lib/types'

/** Nur echte Termine (Vor-Ort, Baubeginn, Abnahme) — keine CRM-Auto-Erinnerungen. */
export const ECHTE_KALENDER_TERMIN_TYPEN = ['besichtigung', 'beginn', 'abnahme'] as const satisfies readonly KalenderTermin['typ'][]

export function istEchterKalenderTermin(
  termin: Pick<KalenderTermin, 'typ'>
): termin is KalenderTermin & { typ: (typeof ECHTE_KALENDER_TERMIN_TYPEN)[number] } {
  return (ECHTE_KALENDER_TERMIN_TYPEN as readonly string[]).includes(termin.typ)
}

/** Anzeige in Mails, Kalender und Termin-Dialog (DB-Typ bleibt `besichtigung`). */
export const VOR_ORT_TERMIN_TITEL = 'Vor-Ort-Termin'

/** Volle Farbe für 3px-Termin-Marker (Mockup cal-evt border-left). */
export const KALENDER_TYP_MARKER: Record<KalenderTermin['typ'], string> = {
  besichtigung: '#C4922A',
  beginn: '#2E7D52',
  abnahme: '#0091AE',
  sonstiges: '#6B7280',
  intern: '#9333EA',
}

export const KALENDER_TYP_LABEL: Record<KalenderTermin['typ'], string> = {
  besichtigung: VOR_ORT_TERMIN_TITEL,
  beginn: 'Beginn',
  abnahme: 'Abnahme',
  sonstiges: 'Sonstiges',
  intern: 'Internes To-do',
}

export function kalenderTypMarkerClass(typ: KalenderTermin['typ']): string {
  return `termin-marker termin-marker-${typ}`
}

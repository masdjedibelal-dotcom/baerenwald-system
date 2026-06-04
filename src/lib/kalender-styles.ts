import type { KalenderTermin } from '@/lib/types'

/** Anzeige in Mails, Kalender und Termin-Dialog (DB-Typ bleibt `besichtigung`). */
export const VOR_ORT_TERMIN_TITEL = 'Vor-Ort-Termin'

/** Volle Farbe für 3px-Termin-Marker (Mockup cal-evt border-left). */
export const KALENDER_TYP_MARKER: Record<KalenderTermin['typ'], string> = {
  besichtigung: '#C4922A',
  beginn: '#2E7D52',
  abnahme: '#0091AE',
  sonstiges: '#6B7280',
}

export const KALENDER_TYP_LABEL: Record<KalenderTermin['typ'], string> = {
  besichtigung: VOR_ORT_TERMIN_TITEL,
  beginn: 'Beginn',
  abnahme: 'Abnahme',
  sonstiges: 'Sonstiges',
}

export function kalenderTypMarkerClass(typ: KalenderTermin['typ']): string {
  return `termin-marker termin-marker-${typ}`
}

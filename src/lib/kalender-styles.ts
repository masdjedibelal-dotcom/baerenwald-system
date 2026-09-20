import type { KalenderTermin } from '@/lib/types'
import {
  terminKategorieLabel,
  terminTypToKategorie,
  type TerminKategorie,
} from '@/lib/kalender/termin-kategorien'
import { C } from '@/lib/tokens/colors'

/** Nur echte Termine (Vor-Ort, Baubeginn, Abnahme) — keine CRM-Auto-Erinnerungen. */
export const ECHTE_KALENDER_TERMIN_TYPEN = [
  'besichtigung',
  'beginn',
  'abnahme',
  'vor_ort',
  'aufmass',
  'projekttermin',
  'kundentermin',
] as const

export function istEchterKalenderTermin(
  termin: Pick<KalenderTermin, 'typ'>
): boolean {
  return (ECHTE_KALENDER_TERMIN_TYPEN as readonly string[]).includes(termin.typ)
}

/** Anzeige in Mails, Kalender und Termin-Dialog (DB-Typ bleibt `besichtigung`). */
export const VOR_ORT_TERMIN_TITEL = 'Vor-Ort-Termin'

const MARKER: Record<string, string> = {
  besichtigung: C.accent,
  vor_ort: C.accent,
  aufmass: C.accent,
  beginn: C.green,
  projekttermin: C.green,
  abnahme: C.teal,
  sonstiges: C.gray500,
  allgemein: C.gray500,
  kundentermin: C.blue,
  kundengespraech: C.blue,
  intern: C.purple,
  privat: C.purple,
}

export const KALENDER_TYP_MARKER: Record<KalenderTermin['typ'], string> = MARKER as Record<
  KalenderTermin['typ'],
  string
>

export const KALENDER_TYP_LABEL: Record<KalenderTermin['typ'], string> = {
  besichtigung: VOR_ORT_TERMIN_TITEL,
  beginn: 'Beginn',
  abnahme: 'Abnahme',
  sonstiges: 'Sonstiges',
  intern: 'Internes To-do',
  vor_ort: 'Vor-Ort Termin',
  kundentermin: 'Kundentermin',
  projekttermin: 'Projekttermin',
  aufmass: 'Aufmaß',
  kundengespraech: 'Kundengespräch',
  allgemein: 'Allgemein',
  privat: 'Privat',
}

export function kalenderTypLabel(typ: string): string {
  const kat = terminTypToKategorie(typ)
  return terminKategorieLabel(kat as TerminKategorie)
}

export function kalenderTypMarkerClass(typ: KalenderTermin['typ']): string {
  return `termin-marker termin-marker-${typ}`
}

export function kalenderTypMarkerColor(typ: string): string {
  return MARKER[typ] ?? MARKER[terminTypToKategorie(typ)] ?? C.gray500
}

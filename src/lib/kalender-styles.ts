import {
  terminKategorieLabel,
  terminTypToKategorie,
  type TerminKategorie,
} from '@/lib/kalender/termin-kategorien'

/** Anzeige in Mails, Kalender und Termin-Dialog (DB-Typ bleibt `besichtigung`). */
export const VOR_ORT_TERMIN_TITEL = 'Vor-Ort-Termin'

export function kalenderTypLabel(typ: string): string {
  const kat = terminTypToKategorie(typ)
  return terminKategorieLabel(kat as TerminKategorie)
}

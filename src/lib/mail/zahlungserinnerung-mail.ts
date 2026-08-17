import { addDaysYmd } from '@/lib/angebot-einfach'
import { effektivesFaelligAmYmd } from '@/lib/dates/werktag'

export type ZahlungserinnerungStufe = 1 | 2

/** Verlängerung der Zahlungsfrist pro Erinnerung (Stufe 1 und 2). */
export const ZAHLUNGSERINNERUNG_FRIST_TAGE = 7

/**
 * Neue Fälligkeit nach Zahlungserinnerung:
 * effektive Fälligkeit + 7 Tage (Sa/So → Werktag).
 */
export function zahlungserinnerungZahlbarBis(
  bisherigeFaelligAmIso: string | null | undefined,
  absendeYmd?: string
): string {
  const basisRaw =
    bisherigeFaelligAmIso?.trim()?.slice(0, 10) ||
    absendeYmd?.trim()?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10)
  const basis = effektivesFaelligAmYmd(basisRaw) ?? basisRaw
  const verlaengert = addDaysYmd(basis, ZAHLUNGSERINNERUNG_FRIST_TAGE)
  return effektivesFaelligAmYmd(verlaengert) ?? verlaengert
}

export function zahlungserinnerungBetreff(stufe: ZahlungserinnerungStufe, nummer: string): string {
  return stufe === 1 ? `Zahlungserinnerung ${nummer}` : `2. Zahlungserinnerung ${nummer}`
}

export type ZahlungserinnerungMailInput = {
  name: string
  nummer: string
  brutto: number
  faelligAm: string
  zahlbarBis: string
  tageUeberfaellig: number
  stufe: ZahlungserinnerungStufe
  iban: string
  anrede?: import('@/lib/mail/anrede').MailAnrede
  kundeTyp?: string | null
}

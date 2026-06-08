import { addDaysYmd } from '@/lib/kalender-auto-termine'

export type ZahlungserinnerungStufe = 1 | 2

export function zahlungserinnerungZahlbarBis(
  stufe: ZahlungserinnerungStufe,
  vonYmd?: string
): string {
  const basis = vonYmd ?? new Date().toISOString().slice(0, 10)
  return addDaysYmd(basis, stufe === 1 ? 7 : 14)
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

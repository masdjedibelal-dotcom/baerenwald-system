/** Festnetz für Kunden-E-Mails (Footer, tel:-Links) — nicht die Mobilnummer. */
export const FESTNETZ_TELEFON_DEFAULT = '089 8095 5726'

/** Erkennt deutsche Mobilnummern (+49 15x/16x/17x oder 016x …). */
export function isMobilnummer(telefon: string): boolean {
  const digits = telefon.replace(/\D/g, '')
  if (!digits) return false
  if (/^491[567]\d/.test(digits)) return true
  if (/^01[567]\d/.test(digits)) return true
  if (/^163\d{6,}/.test(digits)) return true
  return false
}

/** Telefon in Kunden-Mails: immer Festnetz, auch wenn in den Firmeneinstellungen Mobil steht. */
export function telefonFuerKundenMail(firmenTelefon?: string | null): string {
  const env = process.env.EMAIL_FIRMEN_TEL?.trim()
  if (env && !isMobilnummer(env)) return env

  const ausEinstellungen = firmenTelefon?.trim()
  if (ausEinstellungen && !isMobilnummer(ausEinstellungen)) return ausEinstellungen

  return FESTNETZ_TELEFON_DEFAULT
}

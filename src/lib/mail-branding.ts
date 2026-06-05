import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { resolveBrandLogoUrl } from '@/lib/brand'
import { FESTNETZ_TELEFON_DEFAULT, telefonFuerKundenMail } from '@/lib/telefon-kunden-mail'

export type MailBranding = {
  firmenname: string
  telefon: string
  adresseZeile: string
  iban: string
  website: string
  /** Absolute URL — weißes Logo auf grünem E-Mail-Kopf */
  logoUrl: string
  /** Absolute URL — Logo auf hellem/weißem E-Mail-Kopf (Anfrage-Bestätigung) */
  logoUrlOnLight: string
}

export function envMailBranding(): MailBranding {
  return {
    firmenname: 'Bärenwald München',
    telefon: telefonFuerKundenMail(process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL),
    adresseZeile: 'München',
    iban: process.env.EMAIL_FIRMEN_IBAN ?? '',
    website: 'www.baerenwaldmuenchen.de',
    logoUrl: resolveBrandLogoUrl('white'),
    logoUrlOnLight: resolveBrandLogoUrl('green'),
  }
}

/** Für Client-Vorschauen mit `defaultFirmenEinstellungen()` o. Ä. */
export function firmenEinstellungenToMailBranding(f: FirmenEinstellungen): MailBranding {
  const fb = envMailBranding()
  const adresseZeile = [f.strasse, f.plz, f.ort].filter(Boolean).join(', ').trim() || fb.adresseZeile
  return {
    firmenname: f.firmenname?.trim() || fb.firmenname,
    telefon: telefonFuerKundenMail(f.telefon?.trim() || fb.telefon) || FESTNETZ_TELEFON_DEFAULT,
    adresseZeile,
    iban: f.iban?.trim() || fb.iban,
    website: f.website?.trim() || fb.website,
    logoUrl: resolveBrandLogoUrl('white', f.logo_url),
    logoUrlOnLight: resolveBrandLogoUrl('green', f.logo_url),
  }
}

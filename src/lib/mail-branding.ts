import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'

export type MailBranding = {
  firmenname: string
  telefon: string
  adresseZeile: string
  iban: string
}

export function envMailBranding(): MailBranding {
  return {
    firmenname: 'Bärenwald München',
    telefon: process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL ?? '+49 89 00000000',
    adresseZeile: 'München',
    iban: process.env.EMAIL_FIRMEN_IBAN ?? '',
  }
}

export async function getMailBranding(supabase: SupabaseClient): Promise<MailBranding> {
  const f = await fetchFirmenEinstellungen(supabase)
  return firmenEinstellungenToMailBranding(f)
}

/** Für Client-Vorschauen mit `defaultFirmenEinstellungen()` o. Ä. */
export function firmenEinstellungenToMailBranding(f: FirmenEinstellungen): MailBranding {
  const fb = envMailBranding()
  const adresseZeile = [f.strasse, f.plz, f.ort].filter(Boolean).join(', ').trim() || fb.adresseZeile
  return {
    firmenname: f.firmenname?.trim() || fb.firmenname,
    telefon: f.telefon?.trim() || fb.telefon,
    adresseZeile,
    iban: f.iban?.trim() || fb.iban,
  }
}

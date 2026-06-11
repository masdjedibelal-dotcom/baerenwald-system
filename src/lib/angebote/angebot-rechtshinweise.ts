import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  kundeKannReverseCharge13b,
  kundeZeigt35a,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import {
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B,
  HINWEIS_35A_TEMPLATE,
} from '@/lib/rechnung-config'

export type AngebotRechtshinweise = {
  hinweis_35a: boolean
  hinweis_19: boolean
  hinweis_13b: boolean
}

/** Standard je Kundentyp / Firmeneinstellung (Angebots-Wizard). */
export function defaultAngebotRechtshinweise(
  kundeTyp: string | null | undefined,
  firm: FirmenEinstellungen
): AngebotRechtshinweise {
  const klein = parseKleinunternehmerSetting(firm.kleinunternehmer)
  return {
    hinweis_35a: kundeZeigt35a(kundeTyp) && !klein,
    hinweis_19: false,
    hinweis_13b: false,
  }
}

export function parseRechtshinweiseFromWizardMeta(
  raw: unknown,
  kundeTyp: string | null | undefined,
  firm: FirmenEinstellungen
): AngebotRechtshinweise {
  const defaults = defaultAngebotRechtshinweise(kundeTyp, firm)
  if (!raw || typeof raw !== 'object') return defaults
  const wm = raw as Record<string, unknown>
  return {
    hinweis_35a:
      typeof wm.hinweis_35a === 'boolean' ? wm.hinweis_35a : defaults.hinweis_35a,
    hinweis_19: false,
    hinweis_13b:
      typeof wm.hinweis_13b === 'boolean' ? wm.hinweis_13b : defaults.hinweis_13b,
  }
}

export function formatHinweis35a(lohnNetto: number): string {
  const f = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return HINWEIS_35A_TEMPLATE.replace('{lohnNetto}', `${f(lohnNetto)} €`)
}

export { HINWEIS_KLEINUNTERNEHMER, HINWEIS_REVERSE_CHARGE_13B }

export function kannHinweis35aAngebot(
  kundeTyp: string | null | undefined,
  firm: FirmenEinstellungen,
  lohnNetto: number
): boolean {
  return lohnNetto > 0 && kundeZeigt35a(kundeTyp) && !parseKleinunternehmerSetting(firm.kleinunternehmer)
}

export function kannHinweis13bAngebot(
  kundeTyp: string | null | undefined,
  firm: FirmenEinstellungen
): boolean {
  return (
    kundeKannReverseCharge13b(kundeTyp) && !parseKleinunternehmerSetting(firm.kleinunternehmer)
  )
}

/** USt + Steuernummer für PDF-Fuß (wie Musterangebot). */
export function firmenSteuerFooterZeilen(firm: FirmenEinstellungen): string[] {
  const lines: string[] = []
  if (firm.ust_id?.trim()) lines.push(`USt-IdNr.: ${firm.ust_id.trim()}`)
  if (firm.steuernummer?.trim()) lines.push(`Steuernummer: ${firm.steuernummer.trim()}`)
  return lines
}

/** Bankverbindung für Zahlungs-/Überweisungshinweis im Angebot. */
export function firmenBankverbindungZeilen(firm: FirmenEinstellungen): string[] {
  const lines: string[] = []
  if (firm.bank_name?.trim()) lines.push(firm.bank_name.trim())
  if (firm.iban?.trim()) lines.push(`IBAN: ${firm.iban.trim()}`)
  if (firm.bic?.trim()) lines.push(`BIC: ${firm.bic.trim()}`)
  return lines
}

/** @deprecated Nutze firmenSteuerFooterZeilen + firmenBankverbindungZeilen */
export function firmenSteuerBankZeilen(firm: FirmenEinstellungen): string[] {
  return [...firmenSteuerFooterZeilen(firm), ...firmenBankverbindungZeilen(firm)]
}

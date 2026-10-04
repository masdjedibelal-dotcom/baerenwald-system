import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  kundeZeigt35a,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import {
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B
} from '@/lib/rechnung-config'

export type AngebotRechtshinweise = {
  hinweis_35a: boolean
  hinweis_19: boolean
  hinweis_13b: boolean
}

/** Standard-Vorschläge (nur Defaults — Auswahl bleibt immer frei). */
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
  if (!raw || typeof raw !== 'object') {
    return { ...defaults }
  }
  const wm = raw as Record<string, unknown>
  const raw35a =
    typeof wm.hinweis_35a === 'boolean' ? wm.hinweis_35a : defaults.hinweis_35a
  const raw13b =
    typeof wm.hinweis_13b === 'boolean' ? wm.hinweis_13b : defaults.hinweis_13b
  return {
    hinweis_35a: Boolean(raw35a),
    hinweis_19: false,
    hinweis_13b: Boolean(raw13b),
  }
}

export { HINWEIS_KLEINUNTERNEHMER, HINWEIS_REVERSE_CHARGE_13B }

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

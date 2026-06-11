/** Konstanten & Textbausteine für Rechnungs-PDF und UI */

export const RECHNUNG_STATUS = ['entwurf', 'gesendet', 'bezahlt', 'storniert'] as const
export type RechnungStatus = (typeof RECHNUNG_STATUS)[number]

export const RECHNUNG_STATUS_LABELS: Record<RechnungStatus, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

export const RECHNUNG_BELEG_TYPEN = ['rechnung', 'gutschrift'] as const
export type RechnungBelegTyp = (typeof RECHNUNG_BELEG_TYPEN)[number]

export const RECHNUNG_BELEG_TYP_LABELS: Record<RechnungBelegTyp, string> = {
  rechnung: 'Rechnung',
  gutschrift: 'Gutschrift',
}

export const DEFAULT_ZAHLUNGSZIEL_TAGE = 14

/** Standard-MwSt.-Satz, wenn Zeile keinen eigenen Satz hat */
export const DEFAULT_MWST_SATZ = 19

export const EINSTELLUNG_KLEINUNTERNEHMER = 'kleinunternehmer'

/** § 19 UStG — Pflichthinweis auf Rechnungen ohne USt */
export const HINWEIS_KLEINUNTERNEHMER =
  'Gemäß § 19 UStG wird keine USt. berechnet.'

/** § 13b UStG — Reverse Charge Bauleistungen */
export const HINWEIS_REVERSE_CHARGE_13B =
  'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG (Reverse Charge). Die USt. ist vom Leistungsempfänger zu entrichten.'

/** § 35a Abs. 3 EStG — nur wenn Lohnkosten auf der Rechnung ausgewiesen sind (Platzhalter {lohnNetto}) */
export const HINWEIS_35A_TEMPLATE =
  'Steuerlicher Hinweis gemäß § 35a Abs. 3 EStG: Der ausgewiesene Lohnkostenanteil in Höhe von {lohnNetto} kann bei der Einkommensteuer geltend gemacht werden.'

export const MWST_SAETZE_RECHNUNG = [0, 7, 19] as const

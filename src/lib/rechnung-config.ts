/** Konstanten & Textbausteine für Rechnungs-PDF und UI */
import { statusLabel } from '@/lib/status/status-map'

export const RECHNUNG_STATUS = ['entwurf', 'gesendet', 'bezahlt', 'storniert'] as const
export type RechnungStatus = (typeof RECHNUNG_STATUS)[number]

/** Aus status-map abgeleitet (eine Quelle). */
export const RECHNUNG_STATUS_LABELS: Record<RechnungStatus, string> = {
  entwurf: statusLabel('rechnung', 'entwurf'),
  gesendet: statusLabel('rechnung', 'gesendet'),
  bezahlt: statusLabel('rechnung', 'bezahlt'),
  storniert: statusLabel('rechnung', 'storniert'),
}

export const RECHNUNG_BELEG_TYPEN = ['rechnung', 'gutschrift'] as const
export type RechnungBelegTyp = (typeof RECHNUNG_BELEG_TYPEN)[number]

export const RECHNUNG_BELEG_TYP_LABELS: Record<RechnungBelegTyp, string> = {
  rechnung: 'Rechnung',
  gutschrift: 'Gutschrift',
}

/** Standard-MwSt.-Satz, wenn Zeile keinen eigenen Satz hat */
export const DEFAULT_MWST_SATZ = 19

export const EINSTELLUNG_KLEINUNTERNEHMER = 'kleinunternehmer'

/** § 19 UStG — Pflichthinweis auf Rechnungen ohne USt */
export const HINWEIS_KLEINUNTERNEHMER =
  'Gemäß § 19 UStG wird keine USt. berechnet.'

/** § 13b UStG — Reverse Charge Bauleistungen */
export const HINWEIS_REVERSE_CHARGE_13B =
  'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG (Reverse Charge). Die USt. ist vom Leistungsempfänger zu entrichten.'

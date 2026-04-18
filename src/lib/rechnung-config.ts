/** Konstanten & Textbausteine für Rechnungs-PDF und UI */

export const RECHNUNG_STATUS = ['entwurf', 'gesendet', 'bezahlt', 'storniert'] as const
export type RechnungStatus = (typeof RECHNUNG_STATUS)[number]

export const RECHNUNG_STATUS_LABELS: Record<RechnungStatus, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
  storniert: 'Storniert',
}

export const DEFAULT_ZAHLUNGSZIEL_TAGE = 14

/** Standard-MwSt.-Satz für Angebote & Rechnungen */
export const DEFAULT_MWST_SATZ = 19

/** § 35a EStG: Hinweistext (Platzhalter {lohnNetto} {abschlag20}) */
export const HINWEIS_35A_TEMPLATE =
  'Für Privatkunden: Der Lohnkostenanteil von {lohnNetto} € kann nach § 35a EStG steuerlich geltend gemacht werden (20 % = {abschlag20} €).'

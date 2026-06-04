/** Keys in Tabelle `einstellungen` */
export const EINSTELLUNG_KEYS = {
  firmenname: 'firmenname',
  rechtsform: 'rechtsform',
  strasse: 'strasse',
  plz: 'plz',
  ort: 'ort',
  telefon: 'telefon',
  email: 'email',
  website: 'website',
  ust_id: 'ust_id',
  steuernummer: 'steuernummer',
  iban: 'iban',
  bic: 'bic',
  bank_name: 'bank_name',
  logo_url: 'logo_url',
  zahlungsziel_tage: 'zahlungsziel_tage',
  angebot_gueltig_tage: 'angebot_gueltig_tage',
  mwst_satz: 'mwst_satz',
  kleinunternehmer: 'kleinunternehmer',
  pdf_fusszeile: 'pdf_fusszeile',
  /** Name im PDF-Kopf/Fuß (z. B. Geschäftsführer / Inhaber) */
  geschaeftsfuehrer: 'geschaeftsfuehrer',
  /** Pauschale netto für Anfahrt im Angebots-Wizard */
  anfahrt_pauschale_netto: 'anfahrt_pauschale_netto',
  anfahrt_leistung_text: 'anfahrt_leistung_text',
  /** Standard-Lohnanteil in % (Rest Material), z. B. 75 */
  lohn_anteil_standard_prozent: 'lohn_anteil_standard_prozent',
} as const

export type EinstellungKey = (typeof EINSTELLUNG_KEYS)[keyof typeof EINSTELLUNG_KEYS]

export type FirmenEinstellungen = Record<EinstellungKey, string>

export function defaultFirmenEinstellungen(): FirmenEinstellungen {
  return {
    firmenname: 'Bärenwald München',
    rechtsform: '',
    strasse: 'Bärenwaldstraße 20',
    plz: '81737',
    ort: 'München',
    telefon: '089 8095 5726',
    email: 'info@baerenwald-muenchen.de',
    website: 'www.baerenwaldmuenchen.de',
    ust_id: 'DE362198001',
    steuernummer: '14417721070',
    iban: '',
    bic: '',
    bank_name: '',
    logo_url: '',
    zahlungsziel_tage: '14',
    angebot_gueltig_tage: '30',
    mwst_satz: '19',
    kleinunternehmer: '',
    pdf_fusszeile: 'Amtsgericht München · HRB …',
    geschaeftsfuehrer: '',
    anfahrt_pauschale_netto: '49',
    anfahrt_leistung_text: 'Anfahrtskosten (Pauschale)',
    lohn_anteil_standard_prozent: '75',
  }
}

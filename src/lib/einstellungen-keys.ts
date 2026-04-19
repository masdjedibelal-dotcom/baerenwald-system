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
  pdf_fusszeile: 'pdf_fusszeile',
} as const

export type EinstellungKey = (typeof EINSTELLUNG_KEYS)[keyof typeof EINSTELLUNG_KEYS]

export type FirmenEinstellungen = Record<EinstellungKey, string>

export function defaultFirmenEinstellungen(): FirmenEinstellungen {
  return {
    firmenname: 'Bärenwald München',
    rechtsform: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    website: '',
    ust_id: '',
    steuernummer: '',
    iban: '',
    bic: '',
    bank_name: '',
    logo_url: '',
    zahlungsziel_tage: '14',
    angebot_gueltig_tage: '30',
    mwst_satz: '19',
    pdf_fusszeile: 'Amtsgericht München · HRB …',
  }
}

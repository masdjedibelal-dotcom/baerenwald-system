/**
 * Marke (Bärenwald | Servus TEO) — ein Code, zwei Auftritte.
 *
 * Gesetzt über `NEXT_PUBLIC_MARKE` (Netlify). Ohne Variable: Bärenwald (unverändert).
 * Texte/Domains/Logos/Firmen-Vorgaben kommen von hier; Funktionen nur für eine Marke über `funktionAn()`.
 * Wird per `npm run sync:shared-domain` 1:1 ins Website/Portal-Repo kopiert (src/lib/marke.ts).
 */

export type MarkeId = 'baerenwald' | 'teo'

export type MarkeFunktion =
  /** HV-Paket (später nur TEO): Hausmeister, Mieter-/Eigentümer-Portale */
  | 'hvRollen'
  /** HV-Ablauf: Freigabe/Schwelle, Akut/Sofortmaßnahme, eigener HV-Meldungsstatus (Mieter-Meldung wartet auf HV) */
  | 'hvWorkflow'

type Marke = {
  id: MarkeId
  /** Kurzname im Fließtext („… meldet sich Bärenwald“) */
  name: string
  /** Vollständiger Name (Titel, Mails, PDFs) */
  nameLang: string
  /** Kürzel (Avatar, Initialen) */
  kurz: string
  /** Team-Gruß in Mails */
  team: string
  /** Öffentliche Website (ohne https://) */
  websiteHost: string
  /** Name des Kundenportals */
  portalName: string
  /** Name des KI-Assistenten im Portal */
  kiName: string
  /** Portal-Adresse (Fallback, wenn NEXT_PUBLIC_PORTAL_URL fehlt) */
  portalUrl: string
  /** CRM-Adresse (Fallback, wenn NEXT_PUBLIC_APP_URL fehlt) */
  crmUrl: string
  /** Kürzel für Dateinamen (ohne Umlaute/Leerzeichen) */
  dateiKurz: string
  /** Allgemeine Kontakt-Mail */
  infoEmail: string
  /** Firmen-Vorgaben, solange in den Einstellungen nichts gepflegt ist */
  firma: {
    firmenname: string
    inhaber: string
    strasse: string
    hausnummer: string
    plz: string
    ort: string
    email: string
    website: string
  }
  /** Theme-Farbe Browser/PWA */
  themeColor: string
  /** Website/Portal-Repo: volle Marketing-Seiten (Leistungen, Ratgeber, Galerie …)? Aus (TEO) → eigene Startseite + Rechner + Rechtstexte, Rest → Portal */
  marketingSeite: boolean
  /** Rechtstexte (absolut oder Pfad auf der Website/Portal-Domain) */
  recht: { impressum: string; datenschutz: string; agb: string }
  funktionen: Record<MarkeFunktion, boolean>
}

const MARKEN: Record<MarkeId, Marke> = {
  baerenwald: {
    id: 'baerenwald',
    name: 'Bärenwald',
    nameLang: 'Bärenwald München',
    kurz: 'BW',
    team: 'Ihr Bärenwald Team',
    websiteHost: 'baerenwaldmuenchen.de',
    portalName: 'MeinBärenwald',
    kiName: 'BärenwaldGPT',
    portalUrl: 'https://baerenwaldmuenchen.de',
    crmUrl: 'https://baerenwald-backend.netlify.app',
    dateiKurz: 'Baerenwald',
    infoEmail: 'info@baerenwald-muenchen.de',
    firma: {
      firmenname: 'Bärenwald München',
      inhaber: 'Beran Cakmak',
      strasse: 'Bärenwaldstraße',
      hausnummer: '20',
      plz: '81737',
      ort: 'München',
      email: 'info@baerenwald-muenchen.de',
      website: 'www.baerenwaldmuenchen.de',
    },
    themeColor: '#1a3d2b',
    marketingSeite: true,
    recht: { impressum: '/impressum', datenschutz: '/datenschutz', agb: '/agb' },
    funktionen: { hvRollen: false, hvWorkflow: false },
  },
  teo: {
    id: 'teo',
    name: 'Servus TEO',
    nameLang: 'Servus TEO',
    kurz: 'TEO',
    team: 'Ihr Servus TEO Team',
    websiteHost: 'servus-teo.de',
    portalName: 'MeinTEO',
    kiName: 'TEO-Assistent',
    portalUrl: 'https://app.servus-teo.de',
    crmUrl: 'https://crm.servus-teo.de',
    dateiKurz: 'ServusTEO',
    infoEmail: 'info@servus-teo.de',
    firma: {
      firmenname: 'Servus TEO',
      inhaber: 'Belal Masdjedi und Beran Cakmak GbR',
      strasse: 'Seitzstraße',
      hausnummer: '15',
      plz: '80538',
      ort: 'München',
      email: 'info@servus-teo.de',
      website: 'www.servus-teo.de',
    },
    themeColor: '#0b1f3a',
    marketingSeite: false,
    recht: { impressum: '/impressum', datenschutz: '/datenschutz', agb: '/agb' },
    funktionen: { hvRollen: false, hvWorkflow: true },
  },
}

export const MARKE_ID: MarkeId = process.env.NEXT_PUBLIC_MARKE?.trim().toLowerCase() === 'teo' ? 'teo' : 'baerenwald'

export const MARKE: Marke = MARKEN[MARKE_ID]

export const istTeo = MARKE_ID === 'teo'

/** Funktion nur für eine Marke: `if (funktionAn('hvRollen')) …` */
export function funktionAn(f: MarkeFunktion): boolean {
  return MARKE.funktionen[f]
}

/** https://-URL der öffentlichen Website */
export const MARKE_WEBSITE_URL = `https://${MARKE.websiteHost}`

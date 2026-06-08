/** @typedef {{ path: string, title: string, category: string, captureTabs?: boolean }} DocRoute */

/** @type {DocRoute[]} */
export const STATIC_ROUTES = [
  { path: '/', title: 'Dashboard', category: 'Übersicht' },
  { path: '/anfragen', title: 'Anfragen — Liste', category: 'Pipeline' },
  { path: '/anfragen/neu', title: 'Neue Anfrage', category: 'Pipeline' },
  { path: '/angebote', title: 'Angebote — Liste', category: 'Pipeline' },
  { path: '/auftraege', title: 'Aufträge — Liste', category: 'Pipeline' },
  { path: '/rechnungen', title: 'Rechnungen — Liste', category: 'Pipeline' },
  { path: '/rechnungen/neu', title: 'Neue Rechnung', category: 'Pipeline' },
  { path: '/kunden', title: 'Kunden — Liste', category: 'Stammdaten' },
  { path: '/handwerker', title: 'Handwerker — Liste', category: 'Stammdaten' },
  { path: '/partner', title: 'Partner — Liste', category: 'Stammdaten' },
  { path: '/preislisten', title: 'Preislisten', category: 'Stammdaten' },
  { path: '/kalender', title: 'Kalender', category: 'Planung' },
  { path: '/formulare', title: 'Formulare — Liste', category: 'Formulare' },
  { path: '/formulare/neu', title: 'Neues Formular', category: 'Formulare' },
  { path: '/einstellungen', title: 'Einstellungen — Übersicht', category: 'Einstellungen' },
  { path: '/einstellungen/firma', title: 'Firmeneinstellungen', category: 'Einstellungen' },
  { path: '/einstellungen/profil', title: 'Profil', category: 'Einstellungen' },
  { path: '/einstellungen/benutzer', title: 'Benutzer', category: 'Einstellungen' },
  { path: '/einstellungen/gewerke', title: 'Gewerke', category: 'Einstellungen' },
  { path: '/einstellungen/preise', title: 'Preise', category: 'Einstellungen' },
  { path: '/einstellungen/preisliste', title: 'Preisliste bearbeiten', category: 'Einstellungen' },
  { path: '/einstellungen/vorlagen', title: 'Vorlagen', category: 'Einstellungen' },
  { path: '/einstellungen/vorlagen/neu', title: 'Neue Vorlage', category: 'Einstellungen' },
  { path: '/einstellungen/email', title: 'E-Mail', category: 'Einstellungen' },
  { path: '/einstellungen/kommunikation', title: 'Kommunikation', category: 'Einstellungen' },
  { path: '/einstellungen/formulare', title: 'Formular-Einstellungen', category: 'Einstellungen' },
  { path: '/einstellungen/felder', title: 'Felder', category: 'Einstellungen' },
  { path: '/einstellungen/compliance', title: 'Compliance', category: 'Einstellungen' },
  { path: '/einstellungen/datenschutz', title: 'Datenschutz', category: 'Einstellungen' },
  { path: '/einstellungen/integration', title: 'Integration', category: 'Einstellungen' },
  { path: '/login', title: 'Login', category: 'Auth', optional: true },
]

/**
 * Von Listenseiten Links zu Detailseiten ermitteln.
 * @type {{ listPath: string, titlePrefix: string, category: string, pattern: RegExp, exclude?: RegExp, captureTabs?: boolean, max?: number }[]}
 */
export const DISCOVERY_RULES = [
  {
    listPath: '/anfragen',
    titlePrefix: 'Anfrage',
    category: 'Pipeline — Detail',
    pattern: /^\/anfragen\/[0-9a-f-]{36}$/i,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/anfragen',
    titlePrefix: 'Anfrage — Angebote',
    category: 'Pipeline — Detail',
    pattern: /^\/anfragen\/[0-9a-f-]{36}\/angebote$/i,
    max: 1,
  },
  {
    listPath: '/angebote',
    titlePrefix: 'Angebot',
    category: 'Pipeline — Detail',
    pattern: /^\/angebote\/[0-9a-f-]{36}$/i,
    exclude: /bearbeiten/,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/angebote',
    titlePrefix: 'Angebot — Bearbeiten',
    category: 'Pipeline — Wizard',
    pattern: /^\/angebote\/[0-9a-f-]{36}\/bearbeiten$/i,
    max: 1,
  },
  {
    listPath: '/auftraege',
    titlePrefix: 'Auftrag',
    category: 'Pipeline — Detail',
    pattern: /^\/auftraege\/[0-9a-f-]{36}$/i,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/rechnungen',
    titlePrefix: 'Rechnung',
    category: 'Pipeline — Detail',
    pattern: /^\/rechnungen\/[0-9a-f-]{36}$/i,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/kunden',
    titlePrefix: 'Kunde',
    category: 'Stammdaten — Detail',
    pattern: /^\/kunden\/[0-9a-f-]{36}$/i,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/handwerker',
    titlePrefix: 'Handwerker',
    category: 'Stammdaten — Detail',
    pattern: /^\/handwerker\/[0-9a-f-]{36}$/i,
    captureTabs: true,
    max: 1,
  },
  {
    listPath: '/partner',
    titlePrefix: 'Partner',
    category: 'Stammdaten — Detail',
    pattern: /^\/partner\/[0-9a-f-]{36}$/i,
    max: 1,
  },
  {
    listPath: '/formulare',
    titlePrefix: 'Formular',
    category: 'Formulare — Detail',
    pattern: /^\/formulare\/[0-9a-f-]{36}$/i,
    max: 1,
  },
  {
    listPath: '/formulare',
    titlePrefix: 'Formular — Bearbeiten',
    category: 'Formulare — Detail',
    pattern: /^\/formulare\/[0-9a-f-]{36}\/bearbeiten$/i,
    max: 1,
  },
  {
    listPath: '/formulare',
    titlePrefix: 'Formular — Vorschau',
    category: 'Formulare — Detail',
    pattern: /^\/formulare\/[0-9a-f-]{36}\/vorschau$/i,
    max: 1,
  },
  {
    listPath: '/einstellungen/vorlagen',
    titlePrefix: 'Vorlage',
    category: 'Einstellungen — Detail',
    pattern: /^\/einstellungen\/vorlagen\/[0-9a-f-]{36}$/i,
    max: 1,
  },
]

/** Auftrags-Unterflows (relativ zu entdeckter Auftrags-ID). */
export const AUFTRAG_SUB_ROUTES = [
  { suffix: '/finanzen', title: 'Auftrag — Finanzen', category: 'Pipeline — Detail' },
  { suffix: '/abnahme', title: 'Auftrag — Abnahme', category: 'Pipeline — Detail' },
  { suffix: '/abschluss', title: 'Auftrag — Abschluss', category: 'Pipeline — Detail' },
  { suffix: '/rechnungen-auswahl', title: 'Auftrag — Rechnungen', category: 'Pipeline — Detail' },
]

export const VIEWPORTS = {
  desktop: { name: 'desktop', width: 1440, height: 900, label: 'Desktop (1440×900)' },
  mobile: { name: 'mobile', width: 390, height: 844, label: 'Mobile (390×844)', isMobile: true },
}

export const DEFAULT_BASE_URL = process.env.DOCS_BASE_URL?.trim() || 'http://127.0.0.1:3001'
export const OUTPUT_DIR = process.env.DOCS_OUTPUT_DIR?.trim() || 'docs/generated'

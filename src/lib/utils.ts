import type { AngebotStatus, AuftragStatus, LeadKanal, LeadStatus } from '@/lib/types'

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Öffentliche Basis-URL (Links in Mails, Handwerker-Anfrage). Netlify: NEXT_PUBLIC_APP_URL oder URL. */
export function getPublicAppUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (base) return base.replace(/\/$/, '')
  const netlify =
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    process.env.NETLIFY_URL?.trim()
  if (netlify) {
    const withProto = /^https?:\/\//i.test(netlify) ? netlify : `https://${netlify}`
    return withProto.replace(/\/$/, '')
  }
  return 'http://localhost:3000'
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/** PostgREST/JSON: URL-Listen sind manchmal String oder null statt string[]. */
export function normalizeUrlList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return []
}

const eur0: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}

/** Anzeige Gesamt- / Positionspreis: Fix hat Priorität, sonst eine Zahl (kein „X–Y €“). */
export function formatPreis(fix?: number | null, min?: number | null, max?: number | null): string {
  if (fix != null && fix > 0) {
    return `${fix.toLocaleString('de', eur0)} €`
  }
  if (min != null && min > 0 && (max == null || max === min)) {
    return `${min.toLocaleString('de', eur0)} €`
  }
  if (min != null && max != null && max > min) {
    return `${max.toLocaleString('de', eur0)} €`
  }
  if (min != null && min > 0) {
    return `${min.toLocaleString('de', eur0)} €`
  }
  if (max != null && max > 0) {
    return `${max.toLocaleString('de', eur0)} €`
  }
  return '—'
}

export function formatDatum(datum: string): string {
  const d = new Date(datum)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDatumZeit(datum: string): string {
  const d = new Date(datum)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  neu: 'Neu',
  kontaktiert: 'Kontaktiert',
  termin: 'Termin',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  abgeschlossen: 'Abgeschlossen',
  abgebrochen: 'Verloren', // LEAD_ABGEBROCHEN_LABEL in crm-labels.ts
}

export const VERLOREN_GRUND_LABELS: Record<string, string> = {
  zu_teuer: 'Zu teuer',
  kein_interesse: 'Kein Interesse mehr',
  konkurrenz: 'Konkurrenz gewählt',
  nicht_erreichbar: 'Nicht mehr erreichbar',
  sonstiges: 'Sonstiges',
}

/** WhatsApp Deep-Link für Lead-Kontakt */
export function leadWhatsappUrl(
  telefon: string,
  name: string,
  projektText?: string | null
): string {
  const digits = telefon.replace(/\D/g, '')
  if (!digits) return ''
  const projekt = projektText?.trim() || 'Ihre Anfrage'
  const text = `Hallo ${name}, vielen Dank für Ihre Anfrage zu „${projekt}". `
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const KANAL_LABELS: Record<LeadKanal, string> = {
  website: 'Website',
  telefon: 'Telefon',
  whatsapp: 'WhatsApp',
  email: 'E-Mail',
  vor_ort: 'Vor Ort',
  sonstiges: 'Sonstiges',
  hv_melder_link: 'Melde-Link',
  hv_einladung: 'HV-Einladung',
  hv_direkt: 'HV-Meldung',
  hv_katalog: 'HV-Katalog',
  hv_manuell: 'HV manuell',
  org_portal: 'Auftraggeber-Portal',
  org_funnel: 'Org-Projekt',
  org_service: 'Org-Servicepaket',
}

/** Label für beliebigen Kanal-String — nie crashen bei neuen DB-Werten. */
export function kanalLabel(kanal: string | null | undefined): string {
  if (!kanal?.trim()) return '—'
  const known = KANAL_LABELS[kanal as LeadKanal]
  return known ?? kanal
}

export const SITUATION_LABELS: Record<string, string> = {
  zuhause_erneuern: 'Zuhause erneuern',
  reparatur: 'Reparatur',
  defekt: 'Defekt',
  notfall: 'Notfall',
  neu_bauen: 'Neu bauen',
  betreuung: 'Betreuung',
  gewerbe: 'Gewerbe',
  /** Website / Vor-Ort (neu) */
  erneuern: 'Zuhause erneuern',
  kaputt: 'Reparatur / Defekt',
  neubauen: 'Neu bauen / Ausbau',
}

export const AUFTRAG_STATUS_LABELS: Record<AuftragStatus, string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  abnahme: 'Abnahme',
  abgeschlossen: 'Abgeschlossen',
  storniert: 'Storniert',
}

export const FORMULAR_PHASE_LABELS: Record<string, string> = {
  vorab: 'Vorab',
  update: 'Update',
  abnahme: 'Abnahme',
}

export const ANGEBOT_STATUS_LABELS: Record<AngebotStatus, string> = {
  entwurf: 'Entwurf',
  gesendet_handwerker: 'Gesendet Handwerker',
  handwerker_akzeptiert: 'Handwerker akzeptiert',
  gesendet_kunde: 'Gesendet Kunde',
  kunde_akzeptiert: 'Kunde akzeptiert',
  abgelehnt: 'Abgelehnt',
}

export const KALENDER_TYP_BG: Record<string, string> = {
  besichtigung: '#DBEAFE',
  beginn: '#DCFCE7',
  abnahme: '#FFEDD5',
  sonstiges: '#F3F4F6',
}

export const BEREICH_LABELS: Record<string, string> = {
  bad: 'Bad',
  heizung: 'Heizung',
  elektrik: 'Elektrik',
  waende: 'Wände',
  boden: 'Boden',
  fenster: 'Fenster',
  dach: 'Dach',
  fassade: 'Fassade',
  trockenbau: 'Trockenbau',
  garten: 'Garten',
  sanitaer: 'Sanitär',
  schimmel: 'Schimmel / Feuchtigkeit',
  reinigung: 'Reinigung',
  hausmeister: 'Hausmeister',
  winterdienst: 'Winterdienst',
  sonstiges: 'Sonstiges',
  gewerbe: 'Gewerbe',
}

/** Bereich (Funnel) → Gewerk-Slug in DB */
export const BEREICH_TO_GEWERK: Record<string, string> = {
  bad: 'bad',
  heizung: 'heizung',
  elektrik: 'elektrik',
  waende: 'maler',
  boden: 'boden',
  fenster: 'fenster',
  dach: 'dach',
  fassade: 'fassade',
  trockenbau: 'trockenbau',
  sanitaer: 'bad',
  garten: 'garten',
  reinigung: 'reinigung',
  hausmeister: 'hausmeister',
  winterdienst: 'winterdienst',
}

/** Fachdetail-Kombination → bevorzugter Leistungstext (Preisliste) */
export const FACHDETAIL_TO_LEISTUNG: Record<string, string> = {
  'bad.fliesen': 'Fliesen erneuern',
  'bad.objekte': 'Sanitärobjekte tauschen',
  'bad.wanne_dusche': 'Wanne zu Dusche Umbau',
  'bad.komplett': 'Badsanierung komplett',
  'heizung.wartung': 'Heizungswartung',
  'heizung.heizkoerper': 'Heizkörper tauschen',
  'heizung.gas': 'Gas-Therme erneuern',
  'heizung.waermepumpe': 'Wärmepumpe einbauen',
  'heizung.fernwaerme': 'Fernwärme Anschluss',
  'heizung.oel': 'Ölheizung erneuern',
  'boden.laminat': 'Laminat verlegen',
  'boden.parkett': 'Parkett verlegen',
  'boden.parkett_schleifen': 'Parkett abschleifen',
  'boden.vinyl': 'Vinyl verlegen',
  'boden.fliesen': 'Fliesen verlegen',
  'boden.teppich': 'Teppich verlegen',
  'waende.waende': 'Wände streichen',
  'waende.waende_decke': 'Wände + Decke streichen',
  'waende.tapezieren': 'Tapezieren',
  'waende.komplett': 'Komplett streichen',
  'waende.fassade': 'Fassade streichen',
  'sanitaer.leck': 'Leck / Rohrbruch beheben',
  'sanitaer.verstopfung': 'Verstopfung beheben',
  'sanitaer.wc': 'WC Reparatur',
  'sanitaer.armatur': 'Armatur tauschen',
  'elektrik.sicherungskasten': 'Sicherungskasten modernisieren',
  'elektrik.echeck': 'E-Check',
  'elektrik.leitungen': 'Leitungen / Steckdosen neu',
  'elektro_kaputt.sicherung': 'Sicherung / Verteiler',
  'elektro_kaputt.strom_weg': 'Stromausfall beheben',
  'elektro_kaputt.steckdose': 'Steckdose reparieren',
  'elektro_kaputt.fehlersuche': 'Fehlersuche Elektrik',
  'fenster.standard': 'Fenster 2-fach erneuern',
  'fenster.premium': 'Fenster 3-fach erneuern',
  'fenster.haustuere': 'Haustür erneuern',
  'fenster.innentueren': 'Innentüren erneuern',
  'dach.ziegel_wenige': 'Ziegel reparieren',
  'dach.komplett': 'Dach komplett neu',
  'dach.daemmung': 'Dachdämmung',
  'dach.dachfenster': 'Dachfenster einbauen',
  'dach.regenrinne': 'Regenrinne erneuern',
  'dach.ziegel_bereich': 'Dachbereich reparieren',
  'fassade.anstrich': 'Fassade streichen',
  'fassade.klinker': 'Klinker / Backstein',
  'garten.pflege': 'Regelmäßige Gartenpflege',
  'garten.gestaltung': 'Gartengestaltung',
  'garten.baumarbeiten': 'Baumarbeiten',
  'garten.hecke': 'Heckenschnitt',
}

/** Alias gemäß Design-Prompt (Bereiche / Gewerke) */
export const BEREICHE_LABELS = BEREICH_LABELS

/** Budget in Anfragen-Listen (keine Min–Max-Range als „X–Y“). */
export function formatBudget(budget?: number | null, min?: number | null, max?: number | null): string {
  if (budget != null && budget > 0) {
    return `ca. ${budget.toLocaleString('de')} €`
  }
  if (min != null && max != null && max > 0) {
    return `ca. ${Math.round((min + max) / 2).toLocaleString('de')} €`
  }
  if (min != null && min > 0) {
    return `ab ${min.toLocaleString('de')} €`
  }
  return '—'
}

function websiteLeadKomplexAusFunnel(funnel: unknown): boolean {
  if (!funnel || typeof funnel !== 'object') return false
  const f = funnel as Record<string, unknown>
  if (f.preisKomplex === true || f.komplex === true) return true
  const modus = f.preis_modus ?? f.preisModus
  if (typeof modus === 'string' && modus.toLowerCase() === 'komplex') return true
  const fq = f.funnel_quelle ?? f.quelle
  if (fq === 'komplex_rueckruf' || fq === 'beratung') return true
  if (f.situation === 'gewerbe') return true
  const bereiche = Array.isArray(f.bereiche) ? f.bereiche : []
  if (bereiche.includes('gewerbe')) return true
  return false
}

/**
 * Website-Funnel: Anzeige wie für Nutzer:innen (von–bis, Festpreis, ab, ca.-Budget, optional Komplex).
 * Reihenfolge: echte Min/Max-Angaben vor „ca.“-Budget, damit Rahmen nicht durch Mittelwert ersetzt wird.
 */
export function formatWebsiteLeadPreis(
  budget_ca: number | null | undefined,
  preis_min: number | null | undefined,
  preis_max: number | null | undefined,
  funnel?: unknown
): string {
  const komplex = websiteLeadKomplexAusFunnel(funnel)
  const min = preis_min != null && Number.isFinite(Number(preis_min)) && Number(preis_min) > 0 ? Number(preis_min) : null
  const max = preis_max != null && Number.isFinite(Number(preis_max)) && Number(preis_max) > 0 ? Number(preis_max) : null
  const budget = budget_ca != null && Number.isFinite(Number(budget_ca)) && Number(budget_ca) > 0 ? Number(budget_ca) : null

  let basis = ''
  if (min != null && max != null) {
    if (max > min) {
      basis = `${min.toLocaleString('de', eur0)} – ${max.toLocaleString('de', eur0)} €`
    } else {
      basis = `${min.toLocaleString('de', eur0)} €`
    }
  } else if (min != null) {
    basis = `ab ${min.toLocaleString('de', eur0)} €`
  } else if (max != null) {
    basis = `bis ${max.toLocaleString('de', eur0)} €`
  } else if (budget != null) {
    basis = `ca. ${budget.toLocaleString('de', eur0)} €`
  }

  if (komplex) {
    if (basis) return `${basis} · Komplex (individuell)`
    return 'Komplex (individuell)'
  }
  return basis || '—'
}

/** Listen- und Detail-Anzeige: Website = Funnel-Preis, sonst Budget-Logik. */
export function formatAnfragePreisAnzeige(
  kanal: LeadKanal,
  budget_ca: number | null | undefined,
  preis_min: number | null | undefined,
  preis_max: number | null | undefined,
  funnel?: unknown
): string {
  if (kanal === 'website') {
    return formatWebsiteLeadPreis(budget_ca, preis_min, preis_max, funnel)
  }
  return formatBudget(budget_ca ?? undefined, preis_min ?? undefined, preis_max ?? undefined)
}

/** Tabellenkopf bei gemischten Kanälen. */
export function anfragenPreisSpaltenLabel(): string {
  return 'Preisrahmen'
}

/** Detail-Ansicht: einheitlich Preisrahmen. */
export function anfragePreisDetailLabel(_kanal: LeadKanal): string {
  return 'Preisrahmen'
}

/** Relative Zeit für Karten („vor 2h“, „Gestern“ …) */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min`
  if (hours < 24) return `vor ${hours}h`
  if (days === 1) return 'Gestern'
  if (days < 7) {
    return date.toLocaleDateString('de-DE', { weekday: 'short' })
  }
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** Tabellen-Datum: Heute / Gestern / Wochentag / DD.MM. */
export function formatLeadListDatum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startToday.getTime() - startD.getTime()) / 86400000)
  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return d.toLocaleDateString('de-DE', { weekday: 'short' })
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

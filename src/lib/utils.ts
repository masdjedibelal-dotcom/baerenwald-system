import type { AngebotStatus, AuftragStatus, LeadKanal, LeadStatus } from '@/lib/types'
import {
  formatPreis,
  formatEuro,
  formatEuroSpanne,
  formatNumber,
  formatDatum,
  formatDatumZeit,
} from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'

export {
  formatPreis,
  formatEuro,
  formatEuroSpanne,
  formatNumber,
  formatDatum,
  formatDatumZeit,
}

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
  anderer_anbieter: 'Anderer Anbieter',
  kein_bedarf: 'Kein Bedarf',
  nicht_erreichbar: 'Nicht erreichbar',
  kein_interesse: 'Kein Interesse mehr',
  konkurrenz: 'Konkurrenz gewählt',
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
  gesendet_handwerker: 'An Partner gesendet',
  handwerker_akzeptiert: 'Angenommen',
  gesendet_kunde: 'Gesendet',
  kunde_akzeptiert: 'Angenommen',
  abgelehnt: 'Abgelehnt',
}

export const KALENDER_TYP_BG: Record<string, string> = {
  besichtigung: C.blueBg3,
  beginn: C.successBg,
  abnahme: C.amberBg3,
  sonstiges: C.gray100,
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
  'elektro_kaputt.kein_strom': 'Stromausfall beheben',
  'elektro_kaputt.fi_sicherung': 'Sicherung / FI',
  'elektro_kaputt.einzelner_punkt': 'Steckdose / Licht / Schalter',
  'elektro_kaputt.klingel': 'Klingel / Türsprecher',
  'elektro_kaputt.garagentor': 'Garagentor',
  'elektro_kaputt.sonstiges': 'Elektrik — Sonstiges',
  'sanitaer_kaputt.wasser_austritt': 'Wasseraustritt / Leck',
  'sanitaer_kaputt.von_decke_wand': 'Wasser aus Decke oder Wand',
  'sanitaer_kaputt.verstopfung': 'Verstopfung beheben',
  'sanitaer_kaputt.feucht_ohne_lauf': 'Feuchtigkeit ohne laufendes Wasser',
  'sanitaer_kaputt.sonstiges': 'Sanitär — Sonstiges',
  'heizung_kaputt.wohnung_kalt': 'Heizung / Wohnung kalt',
  'heizung_kaputt.kein_warmwasser': 'Kein Warmwasser',
  'heizung_kaputt.wasser_am_hk': 'Leck am Heizkörper',
  'heizung_kaputt.geraeusche': 'Heizung — Geräusche',
  'heizung_kaputt.sonstiges': 'Heizung — Sonstiges',
  'fenster_kaputt.fenster_klemmt_undicht': 'Fenster klemmt / undicht',
  'fenster_kaputt.scheibe_kaputt': 'Fensterscheibe defekt',
  'fenster_kaputt.tuer_schloss': 'Tür / Schloss',
  'fenster_kaputt.sonstiges': 'Fenster / Tür — Sonstiges',
  'dach_kaputt.regenrinne_ueber': 'Regenrinne übergelaufen',
  'dach_kaputt.wasser_fassade': 'Wasser an der Fassade',
  'dach_kaputt.ziegel_boden': 'Dachziegel defekt / fehlen',
  'dach_kaputt.sonstiges': 'Dach — Sonstiges',
  'schimmel_kaputt.schimmel_feucht': 'Schimmel / Feuchtigkeit',
  'schimmel_kaputt.sonstiges': 'Schimmel — Sonstiges',
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
    return `ca. ${formatEuro(budget, { decimals: 0 })}`
  }
  if (min != null && max != null && max > 0) {
    return `ca. ${formatEuro((min + max) / 2, { rounded: true, decimals: 0 })}`
  }
  if (min != null && min > 0) {
    return `ab ${formatEuro(min, { decimals: 0 })}`
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
      basis = formatEuroSpanne(min, max, { decimals: 0 })
    } else {
      basis = formatEuro(min, { decimals: 0 })
    }
  } else if (min != null) {
    basis = `ab ${formatEuro(min, { decimals: 0 })}`
  } else if (max != null) {
    basis = `bis ${formatEuro(max, { decimals: 0 })}`
  } else if (budget != null) {
    basis = `ca. ${formatEuro(budget, { decimals: 0 })}`
  }

  if (komplex) {
    if (basis) return `${basis} · Komplex (individuell)`
    return 'Komplex (individuell)'
  }
  return basis || '—'
}

function funnelQuelle(funnel: unknown): string | null {
  if (!funnel || typeof funnel !== 'object') return null
  const f = funnel as Record<string, unknown>
  const q = f.funnel_quelle ?? f.quelle
  return typeof q === 'string' && q.trim() ? q.trim() : null
}

/** CRM-Staff-Funnel (selbst angelegt) — Preiseinschätzung wie Website (von–bis). */
export function isCrmStaffFunnel(funnel?: unknown): boolean {
  const q = funnelQuelle(funnel)
  return q === 'crm_staff_funnel' || q === 'crm_manuell'
}

/** Listen- und Detail-Anzeige: Website/Staff = von–bis, sonst Budget-Logik. */
export function formatAnfragePreisAnzeige(
  kanal: LeadKanal,
  budget_ca: number | null | undefined,
  preis_min: number | null | undefined,
  preis_max: number | null | undefined,
  funnel?: unknown
): string {
  if (kanal === 'website' || isCrmStaffFunnel(funnel)) {
    return formatWebsiteLeadPreis(budget_ca, preis_min, preis_max, funnel)
  }
  // Min/Max vorhanden → von–bis statt Mittelwert-„Budget“
  if (
    (preis_min != null && Number(preis_min) > 0) ||
    (preis_max != null && Number(preis_max) > 0)
  ) {
    return formatWebsiteLeadPreis(budget_ca, preis_min, preis_max, funnel)
  }
  return formatBudget(budget_ca ?? undefined, preis_min ?? undefined, preis_max ?? undefined)
}

/** Tabellenkopf bei gemischten Kanälen. */
export function anfragenPreisSpaltenLabel(): string {
  return 'Preisrahmen'
}

/** Detail-Ansicht: Staff = Preiseinschätzung, sonst Preisrahmen. */
export function anfragePreisDetailLabel(_kanal: LeadKanal, funnel?: unknown): string {
  return isCrmStaffFunnel(funnel) ? 'Preiseinschätzung' : 'Preisrahmen'
}

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const
const WOCHENTAGE = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const
const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const
const MONATE_KURZ = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const

function parseDisplayDate(raw: string | Date): Date | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw
  }
  const s = (raw ?? '').trim()
  if (!s) return null
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0)
    : new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Wochentag kurz (Mo … So) — feste DE-Namen, kein Locale-API. */
export function formatWochentagKurz(datum: string | Date): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  return WOCHENTAGE_KURZ[d.getDay()] ?? '—'
}

/** „März 2026“ / „März“. */
export function formatMonatJahr(datum: string | Date, opts?: { withYear?: boolean }): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const monat = MONATE[d.getMonth()] ?? '—'
  return opts?.withYear === false ? monat : `${monat} ${d.getFullYear()}`
}

/** „Mär 2026“ / „Mär“. */
export function formatMonatKurzJahr(datum: string | Date, opts?: { withYear?: boolean }): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const monat = MONATE_KURZ[d.getMonth()] ?? '—'
  return opts?.withYear === false ? monat : `${monat} ${d.getFullYear()}`
}

/** „MM.YYYY“. */
export function formatMonatNummerJahr(datum: string | Date): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${mm}.${d.getFullYear()}`
}

/** „19. März“ / „19. März 2026“. */
export function formatTagMonatLang(datum: string | Date, opts?: { withYear?: boolean }): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const monat = MONATE[d.getMonth()] ?? '—'
  const base = `${d.getDate()}. ${monat}`
  return opts?.withYear === false ? base : `${base} ${d.getFullYear()}`
}

/** „Montag, 19. März 2026“ / ohne Jahr. */
export function formatWochentagDatumLang(
  datum: string | Date,
  opts?: { withYear?: boolean }
): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const wt = WOCHENTAGE[d.getDay()] ?? '—'
  const tag = formatTagMonatLang(d, { withYear: opts?.withYear !== false })
  return `${wt}, ${tag}`
}

/** „19. Mär“. */
export function formatTagMonatKurz(datum: string | Date): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const monat = MONATE_KURZ[d.getMonth()] ?? '—'
  return `${d.getDate()}. ${monat}`
}

/** „DD.MM“. */
export function formatTagMonatNummer(datum: string | Date): string {
  const d = parseDisplayDate(datum)
  if (!d) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

/** Relative Zeit für Karten („vor 2h“, „Gestern“ …) */
export function formatRelativeDate(dateStr: string): string {
  const date = parseDisplayDate(dateStr)
  if (!date) return '—'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min`
  if (hours < 24) return `vor ${hours}h`
  if (days === 1) return 'Gestern'
  if (days < 7) return formatWochentagKurz(date)
  return formatTagMonatNummer(date)
}

/** Tabellen-Datum: Heute / Gestern / Wochentag / DD.MM. */
export function formatLeadListDatum(iso: string): string {
  const d = parseDisplayDate(iso)
  if (!d) return '—'
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startToday.getTime() - startD.getTime()) / 86400000)
  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return formatWochentagKurz(d)
  return formatTagMonatNummer(d)
}

/** Mock-Timeline-Zeit: „Heute · 09:12“ / „Gestern · 16:40“. */
export function formatTimelineStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const day = formatLeadListDatum(iso)
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

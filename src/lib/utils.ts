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

/** Öffentliche Basis-URL (Links in Mails, Handwerker-Anfrage) */
export function getPublicAppUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (base) return base.replace(/\/$/, '')
  const v = process.env.VERCEL_URL?.trim()
  if (v) return `https://${v.replace(/^https?:\/\//i, '')}`
  return 'http://localhost:3000'
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
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
    const avg = Math.round((min + max) / 2)
    return `ca. ${avg.toLocaleString('de', eur0)} €`
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
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  abgeschlossen: 'Abgeschlossen',
  abgebrochen: 'Abgebrochen',
}

export const KANAL_LABELS: Record<LeadKanal, string> = {
  website: 'Website',
  telefon: 'Telefon',
  whatsapp: 'WhatsApp',
  email: 'E-Mail',
  vor_ort: 'Vor Ort',
  sonstiges: 'Sonstiges',
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
  'boden.laminat': 'Laminat verlegen',
  'boden.parkett': 'Parkett verlegen',
  'boden.parkett_schleifen': 'Parkett abschleifen',
  'boden.vinyl': 'Vinyl verlegen',
  'boden.fliesen': 'Fliesen verlegen',
  'waende.waende': 'Wände streichen',
  'waende.waende_decke': 'Wände + Decke streichen',
  'waende.tapezieren': 'Tapezieren',
  'dach.ziegel_wenige': 'Ziegel reparieren',
  'dach.komplett': 'Dach komplett neu',
  'fassade.anstrich': 'Fassade streichen',
  'elektrik.sicherungskasten': 'Sicherungskasten modernisieren',
  'elektrik.echeck': 'E-Check',
}

/** Alias gemäß Design-Prompt (Bereiche / Gewerke) */
export const BEREICHE_LABELS = BEREICH_LABELS

export const KANAL_ICONS: Record<string, string> = {
  website: '🌐',
  telefon: '📞',
  whatsapp: '💬',
  email: '✉️',
  vor_ort: '📍',
  sonstiges: '•',
}

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
  return 'Preis / Budget'
}

/** Detail-Ansicht: Website = Preis, sonst Budget. */
export function anfragePreisDetailLabel(kanal: LeadKanal): string {
  return kanal === 'website' ? 'Preis' : 'Budget'
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

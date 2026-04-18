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

export function formatPreis(
  min?: number | null,
  max?: number | null
): string {
  if (min == null && max == null) return '—'
  if (min != null && max != null) {
    return `${min.toLocaleString('de-DE')} – ${max.toLocaleString('de-DE')} €`
  }
  if (min != null) return `ab ${min.toLocaleString('de-DE')} €`
  if (max != null) return `bis ${max.toLocaleString('de-DE')} €`
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

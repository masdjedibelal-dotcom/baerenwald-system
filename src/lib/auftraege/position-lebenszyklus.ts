/** Positions-Lebenszyklus (Spec Bautagebuch neu). status = leistung_status.
 * Contract-Spiegel: handwerks-plattform/src/lib/partner/position-lebenszyklus.ts */

export const POSITION_TYPEN = ['lv', 'regie', 'material'] as const
export type PositionTyp = (typeof POSITION_TYPEN)[number]

export const POSITION_VERGUETUNGEN = ['festpreis', 'aufwand'] as const
export type PositionVerguetung = (typeof POSITION_VERGUETUNGEN)[number]

/** Spec-status — DB-Spalte leistung_status */
export const POSITION_LEBENSZYKLUS = ['offen', 'in_arbeit', 'erledigt'] as const
export type PositionLebenszyklus = (typeof POSITION_LEBENSZYKLUS)[number]

export const EINTRAG_TYPEN = [
  'start',
  'fortschritt',
  'ergebnis',
  'weitere_arbeit',
  'notiz',
] as const
export type EintragTyp = (typeof EINTRAG_TYPEN)[number]

export const EINTRAG_ERFASST_VON = ['partner_app', 'eigenbetrieb_app', 'crm_intern'] as const
export type EintragErfasstVon = (typeof EINTRAG_ERFASST_VON)[number]

export const EINTRAG_QUELLEN = ['telefonisch', 'foto_erhalten', 'vor_ort'] as const
export type EintragQuelle = (typeof EINTRAG_QUELLEN)[number]

export const ANERKENNUNG_STATUS = [
  'nicht_noetig',
  'in_pruefung',
  'anerkannt',
  'abgelehnt',
] as const
export type AnerkennungStatus = (typeof ANERKENNUNG_STATUS)[number]

export const DOKU_UEBERFAELLIG_MS = 24 * 60 * 60 * 1000

export type PositionEintrag = {
  id: string
  /** null = freier Eintrag ohne Leistungsbezug */
  position_id: string | null
  auftrag_id?: string | null
  typ: EintragTyp | string
  beschreibung?: string | null
  beschreibung_roh?: string | null
  zeit_minuten?: number | null
  erfasst_von: EintragErfasstVon | string
  erfasser_akteur?: string | null
  quelle?: EintragQuelle | string | null
  rueckdatiert_grund?: string | null
  ereignis_zeit?: string | null
  created_at?: string | null
  eintrag_fotos?: EintragFoto[] | null
}

export type EintragFoto = {
  id: string
  eintrag_id: string
  storage_path: string
  exif_aufnahme?: string | null
  server_eingang?: string | null
  exif_gps_lat?: number | null
  exif_gps_lng?: number | null
  aufnahmeart?: 'direkt' | 'nachgereicht' | string
  nachreich_grund?: string | null
  created_at?: string | null
  /** Signierte Anzeige-URL (nur CRM-UI). */
  display_url?: string | null
}

export type PositionMaterial = {
  id: string
  position_id: string
  bezeichnung: string
  menge: number
  einzelpreis: number
  beleg_foto_id?: string | null
  created_at?: string | null
}

export type AuftragTagesspanne = {
  auftrag_id: string
  tag: string
  spanne_von: string
  spanne_bis: string
  foto_count: number
}

export function isPositionLebenszyklus(
  v: string | null | undefined
): v is PositionLebenszyklus {
  return !!v && (POSITION_LEBENSZYKLUS as readonly string[]).includes(v)
}

export function lebenszyklusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'in_arbeit':
      return 'In Arbeit'
    case 'erledigt':
      return 'Erledigt'
    default:
      return 'Offen'
  }
}

export function eintragTypLabel(typ: string | null | undefined): string {
  switch (typ) {
    case 'start':
      return 'Start'
    case 'fortschritt':
      return 'Fortschritt'
    case 'ergebnis':
      return 'Ergebnis'
    case 'weitere_arbeit':
      return 'Weitere Arbeit'
    case 'notiz':
      return 'Notiz'
    default:
      return typ?.trim() || 'Eintrag'
  }
}

export function zeitMinutenFromStdMin(
  std: number | null | undefined,
  min: number | null | undefined
): number | null {
  const h = Number(std ?? 0)
  const m = Number(min ?? 0)
  if (!Number.isFinite(h) && !Number.isFinite(m)) return null
  const total = Math.max(0, Math.round(h) * 60 + Math.round(m))
  return total > 0 ? total : null
}

export function formatZeitMinuten(minuten: number | null | undefined): string {
  const n = Math.max(0, Math.round(Number(minuten ?? 0)))
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h <= 0) return `${m} Min`
  if (m <= 0) return `${h} Std`
  return `${h} Std ${m} Min`
}

/** Doku überfällig: Position in Arbeit, letzter Eintrag / Start > 24 h her. */
export function isDokuUeberfaellig(opts: {
  leistungStatus: string | null | undefined
  gestartetAm: string | null | undefined
  letzterEintragAt: string | null | undefined
  nowMs?: number
}): boolean {
  if (String(opts.leistungStatus ?? '') !== 'in_arbeit') return false
  const ref = opts.letzterEintragAt || opts.gestartetAm
  if (!ref) return false
  const t = new Date(ref).getTime()
  if (!Number.isFinite(t)) return false
  const now = opts.nowMs ?? Date.now()
  return now - t > DOKU_UEBERFAELLIG_MS
}

export function sumPartnerZeitMinuten(eintraege: PositionEintrag[]): number {
  return eintraege.reduce((sum, e) => sum + (Number(e.zeit_minuten) || 0), 0)
}

/** Tagesspanne in Minuten (von–bis). */
export function tagesspanneMinuten(spanneVon: string, spanneBis: string): number {
  const a = new Date(spanneVon).getTime()
  const b = new Date(spanneBis).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.round((b - a) / 60_000)
}

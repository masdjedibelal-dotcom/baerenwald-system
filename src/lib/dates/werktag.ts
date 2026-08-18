/** Kalenderdatum YYYY-MM-DD (lokal, ohne UTC-Verschiebung). */

/** CRM-Fristen und Mahnung: deutscher Kalendertag (Netlify/Server = UTC). */
export const CRM_ZEITZONE = 'Europe/Berlin'

export function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-').map((x) => parseInt(x, 10))
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date(NaN)
  return new Date(p[0], p[1] - 1, p[2])
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Heutiges Datum als YYYY-MM-DD in der CRM-Zeitzone. */
export function heuteYmdInZezone(tz: string = CRM_ZEITZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

/** ISO-Zeitstempel → Kalendertag YYYY-MM-DD in der CRM-Zeitzone. */
export function ymdAusIsoInZezone(iso: string, tz: string = CRM_ZEITZONE): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
}

export function tageZwischenYmd(vonYmd: string, bisYmd: string): number {
  const von = parseYmdLocal(vonYmd.slice(0, 10))
  const bis = parseYmdLocal(bisYmd.slice(0, 10))
  if (Number.isNaN(von.getTime()) || Number.isNaN(bis.getTime())) return 0
  von.setHours(0, 0, 0, 0)
  bis.setHours(0, 0, 0, 0)
  return Math.floor((bis.getTime() - von.getTime()) / 86400000)
}

export function isWochenendeYmd(ymd: string): boolean {
  const d = parseYmdLocal(ymd.trim().slice(0, 10))
  if (Number.isNaN(d.getTime())) return false
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

/**
 * Fälligkeit auf Samstag/Sonntag → nächster Werktag (Montag).
 * Feiertage sind nicht enthalten.
 */
export function effektivesFaelligAmYmd(faelligAm: string | null | undefined): string | null {
  if (!faelligAm?.trim()) return null
  const d = parseYmdLocal(faelligAm.trim().slice(0, 10))
  if (Number.isNaN(d.getTime())) return faelligAm.trim().slice(0, 10)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return formatYmdLocal(d)
}

/** Vor dem Speichern: Fälligkeit auf Werktag normalisieren. */
export function normalizeFaelligAmYmd(value: string | null | undefined): string | null {
  const trimmed = value?.trim()?.slice(0, 10)
  if (!trimmed) return null
  return effektivesFaelligAmYmd(trimmed) ?? trimmed
}

export function tageSeitEffektiverFaelligkeit(faelligAm: string | null | undefined): number {
  const eff = effektivesFaelligAmYmd(faelligAm)
  if (!eff) return 0
  return tageZwischenYmd(eff, heuteYmdInZezone())
}

/** Rechnung überfällig (effektive Fälligkeit liegt in der Vergangenheit). */
export function istUeberfaelligYmd(faelligAm: string | null | undefined): boolean {
  return tageSeitEffektiverFaelligkeit(faelligAm) > 0
}

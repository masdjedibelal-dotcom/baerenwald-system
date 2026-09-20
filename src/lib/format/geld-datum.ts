/**
 * Kanonische Geld-/Datumsformatierung (P5-12 / E4 Shared-Domain).
 * Einzige Quelle — UI und Sync nutzen diese Helfer, kein neues Intl außerhalb.
 */

const eur2: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

const eurSpan: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}

function numOrNull(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return n
}

/** Anzeige Gesamt- / Positionspreis: Fix hat Priorität (2 NK); Spannen ohne Zwangs-Nachkommastellen. */
export function formatPreis(fix?: number | null, min?: number | null, max?: number | null): string {
  if (fix != null && fix > 0) {
    return `${fix.toLocaleString('de', eur2)} €`
  }
  if (min != null && min > 0 && (max == null || max === min)) {
    return `${min.toLocaleString('de', eur2)} €`
  }
  if (min != null && max != null && max > min) {
    return `${max.toLocaleString('de', eurSpan)} €`
  }
  if (min != null && min > 0) {
    return `${min.toLocaleString('de', eur2)} €`
  }
  if (max != null && max > 0) {
    return `${max.toLocaleString('de', eur2)} €`
  }
  return '—'
}

export type FormatEuroOpts = {
  /** Nachkommastellen (default 2). Bei rounded=true oft 0. */
  decimals?: 0 | 1 | 2
  /** Vor Formatierung runden (Math.round). */
  rounded?: boolean
  /** plain = „1.234,56 €“; currency = Intl currency EUR. */
  style?: 'plain' | 'currency'
  /** Ohne €-Suffix (z. B. §35a-Texte). */
  suffix?: boolean
  empty?: string
}

/** Geldbetrag — Standard mit 2 NK und „ €“. */
export function formatEuro(n: number | null | undefined, opts?: FormatEuroOpts): string {
  const empty = opts?.empty ?? '—'
  const v0 = numOrNull(n)
  if (v0 == null) return empty
  const decimals = opts?.decimals ?? (opts?.rounded ? 0 : 2)
  const v = opts?.rounded ? Math.round(v0) : v0
  const withSuffix = opts?.suffix !== false

  if (opts?.style === 'currency') {
    const formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v)
    return withSuffix ? formatted : formatted.replace(/\s*€$/, '').trim()
  }

  const formatted = v.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return withSuffix ? `${formatted} €` : formatted
}

/** Preis-Spanne „min – max €“ (gleiche Beträge → ein Wert). */
export function formatEuroSpanne(
  min: number | null | undefined,
  max: number | null | undefined,
  opts?: { decimals?: 0 | 2; empty?: string }
): string {
  const empty = opts?.empty ?? '—'
  const a = numOrNull(min)
  const b = numOrNull(max)
  const decimals = opts?.decimals ?? 0
  if (a == null && b == null) return empty
  if (a != null && (b == null || b === a)) {
    return formatEuro(a, { decimals, suffix: true })
  }
  if (b != null && a == null) {
    return formatEuro(b, { decimals, suffix: true })
  }
  return `${formatEuro(a, { decimals, suffix: false })} – ${formatEuro(b, { decimals, suffix: true })}`
}

export type FormatNumberOpts = {
  decimals?: number
  minDecimals?: number
  maxDecimals?: number
  empty?: string
}

/** Plain number (Menge, KPI, CSV) — kein €. */
export function formatNumber(n: number | null | undefined, opts?: FormatNumberOpts): string {
  const empty = opts?.empty ?? '—'
  const v = numOrNull(n)
  if (v == null) return empty
  const max = opts?.maxDecimals ?? opts?.decimals ?? 0
  const min = opts?.minDecimals ?? opts?.decimals ?? 0
  return v.toLocaleString('de-DE', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })
}

export function formatDatum(datum: string): string {
  const raw = (datum ?? '').trim()
  if (!raw) return '—'
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0)
    : new Date(raw)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function formatDatumZeit(datum: string): string {
  const d = new Date(datum)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

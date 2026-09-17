/** Org-spezifische Rechts-URLs für Mieter-Melde-Routen (wie HV-Portal). */

/**
 * Nutzer-Eingabe → absolute http(s)-URL.
 * Akzeptiert `https://…`, `http://…`, `www.…` und `domain.de/…` (hängt `https://` voran).
 */
export function normalizeOrgHttpUrl(
  raw: string | null | undefined
): string | null {
  let s = String(raw ?? '').trim()
  if (!s) return null
  if (/^\/\//.test(s)) s = `https:${s}`
  else if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

/** Absolute http(s)-URL — inkl. Eingaben wie www.… (nach Normalisierung). */
export function isAbsoluteHttpUrl(raw: string | null | undefined): boolean {
  return normalizeOrgHttpUrl(raw) != null
}

/**
 * Aushang / Melde-Link / QR erst freigeben, wenn HV beide Legal-URLs gesetzt hat.
 */
export function orgMeldeLegalUrlsReady(input: {
  impressum_url?: string | null
  datenschutz_url?: string | null
}): boolean {
  return (
    isAbsoluteHttpUrl(input.impressum_url) &&
    isAbsoluteHttpUrl(input.datenschutz_url)
  )
}

export const ORG_MELDE_LEGAL_REQUIRED_HINT =
  'Bitte zuerst Impressum- und Datenschutz-Link speichern — danach sind Melde-Link, QR und Aushang verfügbar.' as const

export const ORG_MELDE_LEGAL_REQUIRED_ERROR =
  'Impressum- und Datenschutz-Link müssen unter Organisation hinterlegt sein, bevor Aushang oder QR erzeugt werden.' as const

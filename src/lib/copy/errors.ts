/**
 * Fehler- / Systemtexte + userMessage()-Helfer.
 * Toasts ≤ 8 Wörter; Technik nur ins Log (logDbError), nie roh anzeigen.
 */
import { logDbError } from '@/lib/errors/log-db-error'

export const COPY_ERROR = {
  generic: 'Etwas ist schiefgelaufen.',
  offline: 'Keine Verbindung – Erneut versuchen',
  sessionExpired: 'Sitzung abgelaufen — bitte neu anmelden.',
  forbidden: 'Keine Berechtigung für diese Aktion.',
  notFound: 'Eintrag nicht gefunden.',
  validation: 'Bitte Eingaben prüfen.',
  network: 'Keine Verbindung – Erneut versuchen',
} as const

export type CopyErrorKey = keyof typeof COPY_ERROR

const TECH_RE =
  /PGRST|postgres|JWT|ECONN|ENOTFOUND|ETIMEDOUT|fetch failed|TypeError|ReferenceError|column |relation |permission denied|duplicate key|violates|undefined is not|null value|stack trace|supabase|rpc |sqlstate/i

function extractRaw(error: unknown): string | null {
  if (error == null || error === false) return null
  if (typeof error === 'string') return error.trim() || null
  if (typeof error === 'object') {
    const o = error as Record<string, unknown>
    for (const k of ['userMessage', 'message', 'error', 'skipped'] as const) {
      const v = o[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

function looksTechnical(text: string): boolean {
  if (TECH_RE.test(text)) return true
  if (text.length > 120) return true
  if (/^[A-Z]{2,}_[A-Z0-9_]+$/.test(text)) return true
  return false
}

/** Sichtbare Fehlermeldung — nie DB-/Stack-Rohwerte. */
export function userMessage(error: unknown, fallback: string = COPY_ERROR.generic): string {
  const raw = extractRaw(error)
  if (!raw) return fallback
  if (looksTechnical(raw)) return fallback
  /* Bekannte Nutzertexte durchreichen (kurz) */
  return clipToast(raw)
}

/** Toast-Budget ≤ 8 Wörter (harte Kürzung nur als Schutz). */
export function clipToast(text: string, maxWords = 8): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ')}…`
}

/**
 * System-/Netzwerkfehler: Technik loggen, Nutzer nur Copy.
 * Validierungsfehler gehören an Felder — nicht hier.
 */
export function isLikelyOfflineError(error?: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const raw = extractRaw(error)?.toLowerCase() ?? ''
  if (!raw) return typeof navigator !== 'undefined' && navigator.onLine === false
  return (
    /failed to fetch|networkerror|netzwerk|offline|econn|etimedout|enotfound|load failed|internet/i.test(
      raw
    )
  )
}

export function systemErrorMessage(
  error: unknown,
  context = 'ui',
  fallback: string = COPY_ERROR.generic
): string {
  logDbError(context, error)
  if (isLikelyOfflineError(error)) return COPY_ERROR.offline
  return userMessage(error, fallback)
}

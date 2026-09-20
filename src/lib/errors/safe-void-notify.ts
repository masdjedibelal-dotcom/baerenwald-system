<<<<<<< Updated upstream
/**
 * P4-3: Fire-and-forget Mail/Notify/Push — Fehler nicht still schlucken.
 * Server-Pfad: optional Ergebnis → email_log (gesendet|fehler).
 */
import { logDbError } from '@/lib/errors/log-db-error'

export type SafeVoidNotifyResult = {
  ok?: boolean
  success?: boolean
  error?: string | null
  message?: string | null
  sent?: number
  skipped?: string
  emailLogId?: string | null
}

function inferOk(result: unknown): boolean | null {
  if (result == null || typeof result !== 'object') return null
  const r = result as SafeVoidNotifyResult
  if (typeof r.ok === 'boolean') return r.ok
  if (typeof r.success === 'boolean') return r.success
  if (typeof r.sent === 'number') return r.sent > 0 || !r.skipped
  return null
}

function inferError(result: unknown): string | null {
  if (result == null || typeof result !== 'object') return null
  const r = result as SafeVoidNotifyResult
  return (r.error || r.message || r.skipped || null)?.toString().trim() || null
}

/**
 * Fire-and-forget. Bei Rejection → logDbError.
 * Wenn `logToEmail` gesetzt: Ergebnis zusätzlich in email_log (Notify-Pfad).
 */
export function safeVoidNotify(
  label: string,
  promise: Promise<unknown>,
  opts?: {
    /** Wenn true: Ergebnis über logNotifyEmailResult in email_log schreiben (Server). */
    logToEmail?: boolean
    emailTyp?: string
    emailBetreff?: string
  }
): void {
  void promise
    .then(async (result) => {
      if (!opts?.logToEmail) return
      const ok = inferOk(result)
      if (ok === null) return
      try {
        const { logNotifyEmailResult } = await import('@/lib/kommunikation/log-notify-email-result')
        await logNotifyEmailResult({
          typ: opts.emailTyp ?? `void:${label}`,
          betreff: opts.emailBetreff ?? label,
          ok,
          error: ok ? null : inferError(result),
        })
      } catch (err) {
        logDbError(`voidNotify:email_log:${label}`, err)
      }
    })
    .catch((err) => {
      logDbError(`voidNotify:${label}`, err)
      if (opts?.logToEmail) {
        void import('@/lib/kommunikation/log-notify-email-result')
          .then(({ logNotifyEmailResult }) =>
            logNotifyEmailResult({
              typ: opts.emailTyp ?? `void:${label}`,
              betreff: opts.emailBetreff ?? label,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            })
          )
          .catch((e) => logDbError(`voidNotify:email_log-fail:${label}`, e))
      }
    })
=======
import { logDbError } from '@/lib/errors/log-db-error'

/**
 * P4-3 Vorarbeit: Fire-and-forget Notifies nicht still schlucken.
 * Volle email_log-Ergebnisbindung bleibt P4-3 (Restarbeit).
 */
export function safeVoidNotify(label: string, promise: Promise<unknown>): void {
  void promise.catch((err) => {
    logDbError(`voidNotify:${label}`, err)
  })
>>>>>>> Stashed changes
}

/**
 * P4-1 CRM: DB-Fehler sichtbarmachen (Rückgabewerte unverändert lassen).
 * Sentry nur wenn DSN gesetzt (P1-3 / Belal M2).
 */
type Loggable = {
  message?: string
  code?: string
  details?: string
  hint?: string
} | null | undefined

export function logDbError(context: string, error: unknown): void {
  const e = error as Loggable
  const payload = {
    context,
    message: e?.message ?? (error instanceof Error ? error.message : String(error)),
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  }
  console.error('[db]', payload)

  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  if (!dsn) return
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error instanceof Error ? error : new Error(payload.message), {
        tags: { bw_context: context },
        extra: payload,
      })
    })
    .catch(() => {
      /* optional */
    })
}

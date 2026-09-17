import 'server-only'

import { isStagingSupabase } from '@/lib/auth/staging-admin'

/**
 * Staging darf keine echten Resend-Mails auslösen.
 * Override nur explizit: ALLOW_STAGING_REAL_MAIL=1 (Notfall / Debug).
 */
export function isMailCatcherActive(): boolean {
  if (process.env.ALLOW_STAGING_REAL_MAIL === '1') return false
  if (process.env.MAIL_CATCHER === '1') return true
  return isStagingSupabase()
}

export function newMailCatcherId(): string {
  return `staging-catch:${crypto.randomUUID()}`
}

export function logMailCatch(
  channel: string,
  meta: Record<string, unknown>
): void {
  console.info(`[mail-catcher:${channel}]`, {
    ...meta,
    at: new Date().toISOString(),
  })
}

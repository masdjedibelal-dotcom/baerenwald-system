/**
 * Öffentliche CRM-Basis-URL für Auth-Redirects.
 * WICHTIG: nicht baerenwaldmuenchen.de (das ist MeinBärenwald/Website).
 */
export const CRM_PUBLIC_ORIGIN = (
  process.env.CRM_PUBLIC_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'https://baerenwald-backend.netlify.app'
).replace(/\/$/, '')

/** Auth-Callback (Invite, Recovery, Magic Link) — tauscht ?code= gegen Session. */
export function crmAuthCallbackUrl(params?: { type?: 'recovery'; next?: string }): string {
  const url = new URL(`${CRM_PUBLIC_ORIGIN}/auth/callback`)
  if (params?.type) url.searchParams.set('type', params.type)
  if (params?.next) url.searchParams.set('next', params.next)
  return url.toString()
}

/** Passwort-Reset aus CRM-Login — exakte URL muss in Supabase Redirect URLs stehen. */
export function crmPasswordResetRedirectUrl(): string {
  return crmAuthCallbackUrl({ type: 'recovery' })
}

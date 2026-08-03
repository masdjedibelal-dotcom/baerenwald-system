/**
 * Eigener Cookie-Name fürs CRM — Portal/Website nutzen denselben Supabase-Projekt-Ref
 * und damit denselben Default-Cookie (`sb-<ref>-auth-token`).
 * Auf gleichem Host (lokal: localhost:3000 + :3001) überschreibt ein Portal-Login
 * sonst die CRM-Session → Redirect `/login?error=portal_only`.
 */
export const CRM_AUTH_COOKIE_NAME = 'sb-bw-crm-auth'

export const crmAuthCookieOptions = {
  name: CRM_AUTH_COOKIE_NAME,
} as const

/** Fester Staging-CRM-Admin. Nur wirksam, wenn die App an soqownnkxmtfgvsbrgsl hängt. */

export const STAGING_SUPABASE_REF = 'soqownnkxmtfgvsbrgsl'

export const STAGING_ADMIN_EMAIL = 'admin@staging.baerenwald.test'
export const STAGING_ADMIN_PASSWORD = 'StagingTest!2026'
export const STAGING_ADMIN_NAME = 'Staging Admin'

export function isStagingSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return url.includes(STAGING_SUPABASE_REF)
}

export function isStagingAdminEmail(email: string | null | undefined): boolean {
  if (!isStagingSupabase()) return false
  return email?.trim().toLowerCase() === STAGING_ADMIN_EMAIL
}

import type { User } from '@supabase/supabase-js'

const BAERENWALD_PRIMARY_STAFF_EMAIL = 'info@baerenwald-muenchen.de'

export function isBaerenwaldPrimaryStaffEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === BAERENWALD_PRIMARY_STAFF_EMAIL
}

/** CRM-Zugang = Eintrag in user_profiles (siehe is_crm_staff() in Postgres). */
export function crmRoleFromUser(user: User | null | undefined): 'admin' | 'manager' | null {
  if (!user) return null
  if (isBaerenwaldPrimaryStaffEmail(user.email)) return 'admin'

  const userMeta = user.user_metadata as { role?: string } | undefined
  const appMeta = user.app_metadata as {
    role?: string
    crm_role?: string
    is_admin?: boolean
  } | undefined

  const role =
    userMeta?.role ??
    appMeta?.crm_role ??
    (appMeta?.is_admin ? 'admin' : undefined) ??
    appMeta?.role

  if (role === 'admin' || role === 'manager') return role
  return null
}

export function isLikelyPortalOnlyUser(user: User): boolean {
  return !crmRoleFromUser(user)
}

export const CRM_LOGIN_PORTAL_ONLY_MESSAGE =
  'Diese E-Mail ist für MeinBärenwald / das Partner-Portal registriert, nicht für das CRM. ' +
  'Für das CRM nutze die Einladungs-E-Mail (z. B. info@baerenwald-muenchen.de mit Bindestrich) oder bitte einen Admin um CRM-Zugang.'

export const CRM_LOGIN_INVALID_MESSAGE = 'E-Mail oder Passwort falsch.'

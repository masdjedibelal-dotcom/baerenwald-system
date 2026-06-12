import type { User } from '@supabase/supabase-js'

/** CRM-Zugang = Eintrag in user_profiles (siehe is_crm_staff() in Postgres). */
export function crmRoleFromUser(user: User | null | undefined): 'admin' | 'manager' | null {
  if (!user) return null
  const role = (user.user_metadata as { role?: string } | undefined)?.role
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

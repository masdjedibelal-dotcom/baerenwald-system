import type { User } from '@supabase/supabase-js'

/**
 * Vertrauenswürdige Admin-Erkennung (client-sicher, kein next/headers):
 * 1. app_metadata.crm_role / app_metadata.is_crm_admin (kanonisch)
 * 2. Fallback user_metadata.role === 'admin' (Legacy, nur lesen)
 */
export function isCrmAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  const app = (user.app_metadata ?? {}) as {
    crm_role?: string
    is_crm_admin?: boolean
  }
  if (app.is_crm_admin === true) return true
  if (app.crm_role === 'admin') return true
  const meta = (user.user_metadata ?? {}) as { role?: string }
  return meta.role === 'admin'
}

export function crmRoleFromUser(user: User | null | undefined): 'admin' | 'manager' | null {
  if (!user) return null
  if (isCrmAdmin(user)) return 'admin'
  const app = (user.app_metadata ?? {}) as { crm_role?: string }
  if (app.crm_role === 'manager') return 'manager'
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

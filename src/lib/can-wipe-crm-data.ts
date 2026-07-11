import type { User } from '@supabase/supabase-js'
import { crmRoleFromUser } from '@/lib/auth/crm-access'
import { isDemoTestUserEmail } from '@/lib/is-demo-user'

/** Darf Transaktions-/Demo-Daten per API löschen? */
export function canWipeCrmData(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  if (process.env.NODE_ENV === 'development') return true
  if (process.env.CRM_DATA_WIPE_ALLOWED === 'true') return true
  return isDemoTestUserEmail(email)
}

/** Demo-/E2E-Anfragen löschen (scope legacy) — CRM Admin/Manager immer, sonst wie canWipeCrmData. */
export function canPurgeLegacyDemoData(user: User | null | undefined): boolean {
  if (!user?.email?.trim()) return false
  if (process.env.NODE_ENV === 'development') return true
  const role = crmRoleFromUser(user)
  if (role === 'admin' || role === 'manager') return true
  return canWipeCrmData(user.email)
}

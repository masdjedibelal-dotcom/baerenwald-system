import { isDemoTestUserEmail } from '@/lib/is-demo-user'

/** Darf Transaktions-/Demo-Daten per API löschen? */
export function canWipeCrmData(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  if (process.env.NODE_ENV === 'development') return true
  if (process.env.CRM_DATA_WIPE_ALLOWED === 'true') return true
  return isDemoTestUserEmail(email)
}

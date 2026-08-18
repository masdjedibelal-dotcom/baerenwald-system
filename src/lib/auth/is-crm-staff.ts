import type { SupabaseClient, User } from '@supabase/supabase-js'
import { crmRoleFromUser, isBaerenwaldPrimaryStaffEmail } from '@/lib/auth/crm-access'
import { isStagingAdminEmail } from '@/lib/auth/staging-admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** CRM Admin oder Manager — für Portal-Impersonation und sensible Aktionen. */
export async function isCrmAdminOrManager(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<boolean> {
  if (!user?.id) return false
  if (isBaerenwaldPrimaryStaffEmail(user.email)) return true
  if (isStagingAdminEmail(user.email)) return true

  const metaRole = crmRoleFromUser(user)
  if (metaRole === 'admin' || metaRole === 'manager') return true

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role as string | undefined
  return role === 'admin' || role === 'manager'
}

/**
 * Auth-User ist CRM-Team (user_profiles) — darf nicht durch Handwerker-Löschen/Portal-Sperre gebannt werden.
 * Ein Login kann CRM + Partner-Portal teilen (gleiche E-Mail).
 */
export async function authUserIsCrmTeam(authUserId: string): Promise<boolean> {
  const id = authUserId?.trim()
  if (!id) return false

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, role')
    .eq('id', id)
    .maybeSingle()

  if (profile?.id) {
    if (isBaerenwaldPrimaryStaffEmail(profile.email as string | null)) return true
    if (isStagingAdminEmail(profile.email as string | null)) return true
    const role = profile.role as string | undefined
    if (role === 'admin' || role === 'manager' || role === 'staff') return true
    // Profil existiert = CRM-Zugang, auch ohne Rolle
    return true
  }

  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id)
    const email = data.user?.email
    if (isBaerenwaldPrimaryStaffEmail(email)) return true
    if (isStagingAdminEmail(email)) return true
    if (crmRoleFromUser(data.user)) return true
  } catch {
    /* ignore */
  }
  return false
}

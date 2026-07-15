import type { SupabaseClient, User } from '@supabase/supabase-js'
import { crmRoleFromUser, isBaerenwaldPrimaryStaffEmail } from '@/lib/auth/crm-access'

/** CRM Admin oder Manager — für Portal-Impersonation und sensible Aktionen. */
export async function isCrmAdminOrManager(
  supabase: SupabaseClient,
  user: User | null | undefined
): Promise<boolean> {
  if (!user?.id) return false
  if (isBaerenwaldPrimaryStaffEmail(user.email)) return true

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

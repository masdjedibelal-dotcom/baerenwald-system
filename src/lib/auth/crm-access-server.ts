import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { isCrmAdmin } from '@/lib/auth/crm-access'

/** Server-only: Admin-Gate für Actions/Routes. */
export async function requireCrmAdmin(): Promise<
  { ok: true; user: User } | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }
  if (!isCrmAdmin(user)) return { ok: false, message: 'Nur für CRM-Admins.' }
  return { ok: true, user }
}

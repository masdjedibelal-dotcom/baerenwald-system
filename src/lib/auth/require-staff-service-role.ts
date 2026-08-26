import 'server-only'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { authUserIsCrmTeam } from '@/lib/auth/is-crm-staff'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export type StaffServiceRole =
  | { ok: true; user: User; db: SupabaseClient }
  | { ok: false; message: string }

/**
 * CRM-Staff-Gate + Service-Role-Client für mutierende Server-Actions.
 *
 * Warum: Detail-/Listen-Seiten laden oft über `withCrmReadFallback` (Admin bei RLS).
 * Mutationen über den User-Client finden denselben Datensatz dann nicht
 * („Rechnung nicht gefunden“ trotz sichtbarer Detailseite).
 *
 * Sicherheit: Nur CRM-Team (`user_profiles` / Staff-E-Mail). Portal-/Partner-/Token-
 * Kontexte dürfen diesen Helper NIEMALS nutzen — dort bleibt User-Client + RLS.
 */
export async function requireStaffAndServiceRole(): Promise<StaffServiceRole> {
  const auth = createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user?.id) {
    return { ok: false, message: 'Nicht angemeldet.' }
  }

  const staff = await authUserIsCrmTeam(user.id)
  if (!staff) {
    return { ok: false, message: 'Nur für CRM-Team.' }
  }

  return { ok: true, user, db: getSupabaseAdmin() }
}

'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CRM_LOGIN_PORTAL_ONLY_MESSAGE } from '@/lib/auth/crm-access'
import { getPublicAppUrl } from '@/lib/utils'

export async function verifyCrmStaffSession(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return { ok: false, message: CRM_LOGIN_PORTAL_ONLY_MESSAGE }
  }

  return { ok: true }
}

export async function requestCrmPasswordReset(
  email: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed.includes('@')) return { ok: false, message: 'Gültige E-Mail eingeben.' }

  const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
  const authUser = (listed?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === trimmed)
  if (!authUser) {
    // Kein User-Enumeration — gleiche Antwort wie bei Erfolg
    return { ok: true }
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!profile) {
    return {
      ok: false,
      message:
        'Diese E-Mail gehört zum Kunden- oder Partner-Portal (MeinBärenwald), nicht zum CRM. ' +
        'Passwort dort unter baerenwaldmuenchen.de zurücksetzen — für das CRM brauchst du eine separate CRM-Einladung.',
    }
  }

  const base = getPublicAppUrl()
  const redirectTo = `${base}/auth/reset-password`

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
  if (error) return { ok: false, message: error.message }

  return { ok: true }
}

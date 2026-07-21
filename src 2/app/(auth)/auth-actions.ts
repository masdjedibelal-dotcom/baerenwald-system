'use server'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CRM_LOGIN_PORTAL_ONLY_MESSAGE } from '@/lib/auth/crm-access'
import { crmPasswordResetRedirectUrl } from '@/lib/auth/crm-auth-url'
import { sendMail } from '@/lib/mail-service'

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

  const redirectTo = crmPasswordResetRedirectUrl()

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: trimmed,
    options: { redirectTo },
  })

  const actionLink = linkData?.properties?.action_link?.trim()
  if (linkErr || !actionLink) {
    return { ok: false, message: linkErr?.message ?? 'Reset-Link konnte nicht erzeugt werden.' }
  }

  const sent = await sendMail({
    typ: 'crm_password_reset',
    an: trimmed,
    betreff: 'Bärenwald CRM — Passwort zurücksetzen',
    html: `
      <p>Hallo,</p>
      <p>du hast ein neues Passwort für das <strong>Bärenwald CRM</strong> angefordert.</p>
      <p style="margin:24px 0">
        <a href="${actionLink}" style="display:inline-block;padding:12px 20px;background:#2E7D52;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Neues CRM-Passwort setzen
        </a>
      </p>
      <p style="font-size:13px;color:#666">
        Dieser Link führt ins CRM (<code>baerenwald-backend.netlify.app</code>), nicht zu MeinBärenwald.
        Falls du nur das Kundenportal meinst, nutze
        <a href="https://baerenwaldmuenchen.de/portal/login">baerenwaldmuenchen.de/portal</a>.
      </p>
      <p style="font-size:13px;color:#666">Wenn du das nicht warst, ignoriere diese E-Mail.</p>
    `,
  })

  if (!sent.success) {
    return { ok: false, message: sent.error ?? 'E-Mail konnte nicht gesendet werden.' }
  }

  return { ok: true }
}

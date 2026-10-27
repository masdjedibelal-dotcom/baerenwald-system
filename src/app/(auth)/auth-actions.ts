'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CRM_LOGIN_PORTAL_ONLY_MESSAGE } from '@/lib/auth/crm-access'
import { isStagingAdminEmail, STAGING_ADMIN_EMAIL, STAGING_ADMIN_NAME } from '@/lib/auth/staging-admin'
import { crmPasswordResetRedirectUrl } from '@/lib/auth/crm-auth-url'
import { MARKE } from '@/lib/marke'
import { sendMail } from '@/lib/mail-service'
import { C } from '@/lib/tokens/colors'

export async function verifyCrmStaffSession(
  /** Nach Client-Login: User-ID direkt prüfen (Cookie oft noch nicht im Server Action). */
  userId?: string
): Promise<{ ok: true } | { ok: false; message: string; reason: 'no_session' | 'portal_only' }> {
let uid = userId?.trim() || ''
  if (!uid) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    uid = user?.id ?? ''
  }
  if (!uid) return { ok: false, message: 'Nicht angemeldet.', reason: 'no_session' }

  // Service-Role: unabhängig vom Cookie-Timing der Browser-Session
  const {data: profile, error} = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', uid)
    .maybeSingle()
  if (error) logDbError('app/auth-actions:user_profiles', error)

  if (profile) return { ok: true }

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(uid)
  if (isStagingAdminEmail(authData.user?.email)) {
    const { error: __dbErr1 } = await supabaseAdmin.from('user_profiles').upsert({
      id: uid,
      name: STAGING_ADMIN_NAME,
      email: STAGING_ADMIN_EMAIL,
    })
    if (__dbErr1) logDbError('app/auth-actions:user_profiles', __dbErr1)
    return { ok: true }
  }

  return { ok: false, message: CRM_LOGIN_PORTAL_ONLY_MESSAGE, reason: 'portal_only' }
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

  const {data: profile, error} = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle()
  if (error) logDbError('app/auth-actions:user_profiles', error)

  if (!profile) {
    return {
      ok: false,
      message:
        `Diese E-Mail gehört zum Kunden- oder Partner-Portal (${MARKE.portalName}), nicht zum CRM. ` +
        `Passwort dort unter ${MARKE.websiteHost} zurücksetzen — für das CRM brauchen Sie eine eigene CRM-Einladung.`,
    }
  }

  const redirectTo = crmPasswordResetRedirectUrl()

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: trimmed,
    options: { redirectTo },
  })

  // Eigener Link mit token_hash: der Callback prüft ihn serverseitig (verifyOtp).
  // Der action_link von Supabase liefert die Sitzung im #-Fragment, das der Server nie sieht.
  const tokenHash = linkData?.properties?.hashed_token?.trim()
  if (linkErr || !tokenHash) {
    return { ok: false, message: linkErr?.message ?? 'Reset-Link konnte nicht erzeugt werden.' }
  }
  const resetUrl = new URL(redirectTo)
  resetUrl.searchParams.set('token_hash', tokenHash)
  resetUrl.searchParams.set('type', 'recovery')
  const actionLink = resetUrl.toString()
  const crmHost = new URL(redirectTo).host

  const sent = await sendMail({
    typ: 'crm_password_reset',
    an: trimmed,
    betreff: `${MARKE.name} CRM — Passwort zurücksetzen`,
    html: `
      <p>Hallo,</p>
      <p>Sie haben ein neues Passwort für das <strong>${MARKE.name} CRM</strong> angefordert.</p>
      <p style="margin:24px 0">
        <a href="${actionLink}" style="display:inline-block;padding:12px 20px;background:${C.green};color:${C.white};text-decoration:none;border-radius:8px;font-weight:600">
          Neues CRM-Passwort setzen
        </a>
      </p>
      <p style="font-size:13px;color:${C.grayNeutral3}">
        Dieser Link führt ins CRM (<code>${crmHost}</code>), nicht zu ${MARKE.portalName}.
        Falls Sie das Kundenportal meinen, nutzen Sie
        <a href="${MARKE.portalUrl}/portal/login">${MARKE.websiteHost}/portal</a>.
      </p>
      <p style="font-size:13px;color:${C.grayNeutral3}">Wenn Sie das nicht waren, ignorieren Sie diese E-Mail.</p>
    `,
  })

  if (!sent.success) {
    return { ok: false, message: sent.error ?? 'E-Mail konnte nicht gesendet werden.' }
  }

  return { ok: true }
}

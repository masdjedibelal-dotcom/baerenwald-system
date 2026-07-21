/**
 * CRM → Portal Impersonation Token (HMAC, kompatibel mit Portal /auth/crm-enter).
 */
import { createHmac, randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type ImpersonationTargetType = 'kunde' | 'handwerker' | 'organisation'

type Payload = {
  email: string
  roleLabel: string
  targetType: string
  targetId: string
  adminId: string
  adminEmail: string
  exp: number
  jti: string
}

function partnerSecret(): string | null {
  return process.env.PARTNER_INTERNAL_API_SECRET?.trim() || null
}

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

function signBody(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('base64url')
}

export async function createPortalImpersonationUrl(input: {
  adminId: string
  adminEmail: string
  targetType: ImpersonationTargetType
  targetId: string
  targetEmail: string
  roleLabel: string
  nextPath: '/portal' | '/partner' | string
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const key = partnerSecret()
  if (!key) {
    return { ok: false, message: 'PARTNER_INTERNAL_API_SECRET fehlt (CRM-Umgebung).' }
  }
  const email = input.targetEmail.trim().toLowerCase()
  if (!email.includes('@')) {
    return { ok: false, message: 'Ziel braucht eine gültige E-Mail.' }
  }

  const jti = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + 5 * 60
  const payload: Payload = {
    email,
    roleLabel: input.roleLabel,
    targetType: input.targetType,
    targetId: input.targetId,
    adminId: input.adminId,
    adminEmail: input.adminEmail,
    exp,
    jti,
  }

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const token = `${body}.${signBody(body, key)}`

  const { error } = await supabaseAdmin.from('crm_impersonation_tokens').insert({
    jti,
    admin_id: input.adminId,
    admin_email: input.adminEmail,
    target_type: input.targetType,
    target_id: input.targetId,
    target_email: email,
    role_label: input.roleLabel,
    expires_at: new Date(exp * 1000).toISOString(),
  })
  if (error) {
    // Tabelle fehlt evtl. lokal — Token trotzdem ausstellen, One-time dann soft
    console.warn('[impersonation] Token-Insert:', error.message)
  }

  const next = input.nextPath.startsWith('/') ? input.nextPath : `/${input.nextPath}`
  const url = `${siteBase()}/auth/crm-enter?t=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
  return { ok: true, url }
}

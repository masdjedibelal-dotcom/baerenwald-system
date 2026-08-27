'use server'

import { createClient } from '@/lib/supabase-server'
import type { EmailOtpType } from '@supabase/supabase-js'

export type AuthCallbackResult =
  | { ok: true; redirect: string }
  | { ok: false; redirect: string; message: string }

/**
 * Server-seitiger Code/Token-Exchange (Invite / Magic / Recovery).
 * Client zeigt nur Splash — kein exchangeCodeForSession im Browser (PKCE-Falle).
 */
export async function completeAuthCallback(input: {
  code?: string | null
  tokenHash?: string | null
  type?: string | null
  next?: string | null
}): Promise<AuthCallbackResult> {
  const nextRaw = (input.next ?? '/').trim() || '/'
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/'
  const type = (input.type ?? '').trim()
  const code = input.code?.trim() || ''
  const tokenHash = input.tokenHash?.trim() || ''

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return {
        ok: false,
        message: error.message,
        redirect: `/login?error=${encodeURIComponent(error.message)}`,
      }
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    })
    if (error) {
      return {
        ok: false,
        message: error.message,
        redirect: `/login?error=${encodeURIComponent(error.message)}`,
      }
    }
  } else {
    return { ok: false, message: 'auth_callback', redirect: '/login?error=auth_callback' }
  }

  if (type === 'recovery') {
    return { ok: true, redirect: '/auth/reset-password' }
  }
  return { ok: true, redirect: next }
}

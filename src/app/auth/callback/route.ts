import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getPublicAppUrl } from '@/lib/utils'

/** Supabase Auth-Redirect (Invite, Magic Link, Recovery) — Code gegen Session tauschen. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')?.trim() || '/'
  const base = getPublicAppUrl()

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth_callback`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  const type = url.searchParams.get('type')
  if (type === 'recovery') {
    return NextResponse.redirect(`${base}/auth/reset-password`)
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(`${base}${safeNext}`)
}

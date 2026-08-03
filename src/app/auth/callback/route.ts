import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { crmAuthCookieOptions } from '@/lib/auth/crm-auth-cookie'
import {
  matchAuthCookieNames,
  supabaseLegacyAuthCookieBaseName,
} from '@/lib/auth/supabase-legacy-auth-cookie'

function redirectTarget(origin: string, type: string | null, next: string): string {
  if (type === 'recovery') return `${origin}/auth/reset-password`
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return `${origin}${safeNext}`
}

function clearLegacyAuthCookies(response: NextResponse, request: NextRequest) {
  const legacyBase = supabaseLegacyAuthCookieBaseName()
  if (!legacyBase) return
  const names = matchAuthCookieNames(
    request.cookies.getAll().map((c) => c.name),
    legacyBase
  )
  for (const name of names) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 })
  }
}

/** Supabase Auth-Redirect (Invite, Magic Link, Recovery) — Code gegen Session tauschen. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type')
  const next = url.searchParams.get('next')?.trim() || '/'
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

  let response = NextResponse.redirect(redirectTarget(origin, type, next))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: crmAuthCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.redirect(redirectTarget(origin, type, next))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Legacy-Default-Cookie entfernen, damit Portal-Login ihn nicht mit CRM-Staff teilt
  clearLegacyAuthCookies(response, request)

  return response
}

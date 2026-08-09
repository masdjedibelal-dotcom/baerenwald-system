import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isDevAuthSkipEnabled } from '@/lib/dev-auth'

function devAuthSkipEnabled(): boolean {
  return isDevAuthSkipEnabled()
}

function supabaseEnvMissing(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  return !url || !key
}

export async function middleware(request: NextRequest) {
  if (supabaseEnvMissing()) {
    return new NextResponse(
      [
        'Konfigurationsfehler: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen gesetzt sein',
        '(z. B. in Netlify: Site settings → Environment variables).',
        'Ohne diese Werte kann die Middleware nicht starten — die Seite wirkt dann „tot“ oder liefert 5xx.',
      ].join('\n'),
      {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }
    )
  }

  const path = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', path)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: { id: string } | null = null
  let authReachable = true
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      const err = error as unknown as { status?: number; name?: string }
      if (err.status === 0 || err.name === 'AuthRetryableFetchError') {
        authReachable = false
      }
    }
    user = data.user
  } catch {
    authReachable = false
  }

  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth/') ||
    path.startsWith('/formular/') ||
    path.startsWith('/projekt/') ||
    path.startsWith('/status/') ||
    path.startsWith('/nachtrag/') ||
    path.startsWith('/handwerker/anfrage/') ||
    path.startsWith('/api/lead') ||
    path.startsWith('/api/formular/') ||
    path.startsWith('/api/handwerker/anfrage/') ||
    path.startsWith('/api/telegram') ||
    path.startsWith('/api/copilot/') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/dev/auto-login')

  if (devAuthSkipEnabled() && !user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/dev/auto-login'
    url.searchParams.set('next', path === '/login' ? '/' : path)
    return NextResponse.redirect(url)
  }

  if (!authReachable) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

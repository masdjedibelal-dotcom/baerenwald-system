import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getDevCrmCredentials, isDevAuthSkipEnabled } from '@/lib/dev-auth'

export async function GET(request: Request) {
  if (!isDevAuthSkipEnabled()) {
    return NextResponse.json({ error: 'Nur in der lokalen Entwicklung erlaubt.' }, { status: 403 })
  }

  const creds = getDevCrmCredentials()
  if (!creds) {
    return NextResponse.json(
      {
        error:
          'DEV_CRM_EMAIL und DEV_CRM_PASSWORD in .env.local setzen (Mitarbeiter-Account aus Supabase Auth).',
      },
      { status: 500 }
    )
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword(creds)
  if (error) {
    const login = new URL('/login', request.url)
    login.searchParams.set('dev_error', encodeURIComponent(error.message))
    return NextResponse.redirect(login)
  }

  const next = new URL(request.url).searchParams.get('next') || '/'
  const target = next.startsWith('/') ? next : '/'
  return NextResponse.redirect(new URL(target, request.url))
}

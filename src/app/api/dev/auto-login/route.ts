import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getDevCrmCredentials, isDevAuthSkipEnabled } from '@/lib/dev-auth'

async function signInWithPassword(email: string, password: string) {
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
  return supabase.auth.signInWithPassword({ email, password })
}

/** Fallback ohne DEV_CRM_PASSWORD: Service-Role + OTP (wie docs-screenshots). */
async function signInWithServiceOtp() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anonKey || !serviceKey) return { error: new Error('Supabase-Keys fehlen') }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 })
  if (listErr) return { error: listErr }

  const { data: crmProfiles } = await admin.from('user_profiles').select('id')
  const crmIds = new Set((crmProfiles ?? []).map((p) => p.id))

  const candidates = usersData.users.filter((u) => u.email && !u.email.endsWith('@anon.local'))
  const user =
    candidates.find((u) => crmIds.has(u.id)) ??
    candidates.find((u) => {
      const meta = (u.user_metadata ?? {}) as { portal_role?: string }
      return meta.portal_role !== 'handwerker'
    }) ??
    candidates[0]

  if (!user?.email) return { error: new Error('Kein CRM-Auth-User gefunden') }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://127.0.0.1:3001/' },
  })
  if (linkErr || !linkData?.properties?.email_otp) {
    return { error: linkErr ?? new Error('OTP konnte nicht erzeugt werden') }
  }

  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    email: user.email,
    token: linkData.properties.email_otp,
    type: 'email',
  })
  if (verifyErr || !verified.session) {
    return { error: verifyErr ?? new Error('OTP-Verifizierung fehlgeschlagen') }
  }

  const cookieStore = cookies()
  const supabase = createServerClient(url, anonKey, {
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
  })

  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })
  return { error: sessionErr }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!isDevAuthSkipEnabled()) {
    return NextResponse.json({ error: 'Nur in der lokalen Entwicklung erlaubt.' }, { status: 403 })
  }

  const creds = getDevCrmCredentials()
  let error: { message: string } | null = null

  if (creds) {
    const res = await signInWithPassword(creds.email, creds.password)
    error = res.error
  } else {
    const res = await signInWithServiceOtp()
    error = res.error
  }

  if (error) {
    const login = new URL('/login', request.url)
    login.searchParams.set('dev_error', encodeURIComponent(error.message))
    return NextResponse.redirect(login)
  }

  const next = new URL(request.url).searchParams.get('next') || '/'
  const target = next.startsWith('/') ? next : '/'
  return NextResponse.redirect(new URL(target, request.url))
}

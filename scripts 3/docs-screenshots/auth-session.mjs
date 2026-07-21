/**
 * Dev-only: Supabase-Session für Screenshot-Docs (Service-Role + OTP, kein Passwort nötig).
 */
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { loadEnvLocal } from './lib.mjs'

loadEnvLocal()

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY in .env.local nötig.'
    )
  }
  return { url, anonKey, serviceKey }
}

async function createDocsSession() {
  const { url, anonKey, serviceKey } = supabaseEnv()
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 })
  if (listErr) throw new Error(`Supabase listUsers: ${listErr.message}`)

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

  if (!user?.email) {
    throw new Error('Kein CRM-Auth-User gefunden.')
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
    options: { redirectTo: 'http://127.0.0.1:3001/' },
  })

  if (linkErr || !linkData?.properties?.email_otp) {
    throw new Error(`OTP-Link fehlgeschlagen: ${linkErr?.message ?? 'kein OTP'}`)
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
    throw new Error(`OTP-Verifizierung fehlgeschlagen: ${verifyErr?.message ?? 'keine Session'}`)
  }

  const cookiesToSet = []
  const serverClient = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => {
        cookiesToSet.push(...cookies)
      },
    },
  })

  const { error: sessionErr } = await serverClient.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })

  if (sessionErr) {
    throw new Error(`Session setzen fehlgeschlagen: ${sessionErr.message}`)
  }

  return { email: user.email, cookies: cookiesToSet }
}

export const DATENSCHUTZ_STORAGE_KEY = 'baerenwald_datenschutz_hint_v1'

/** localStorage vor React-Hydration setzen, damit das Datenschutz-Modal nie öffnet. */
export async function prepareDocsBrowserPage(page) {
  await page.evaluateOnNewDocument((key) => {
    try {
      window.localStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
  }, DATENSCHUTZ_STORAGE_KEY)
}

/** Datenschutz-Modal schließen / entfernen — vor jedem Screenshot aufrufen. */
export async function dismissBlockingModals(page) {
  await page.evaluate((key) => {
    try {
      window.localStorage.setItem(key, '1')
    } catch {
      /* ignore */
    }
  }, DATENSCHUTZ_STORAGE_KEY)

  try {
    await page.waitForFunction(
      () => {
        for (const el of document.querySelectorAll('.modal-overlay')) {
          const title = el.querySelector('.modal-title')
          if (title?.textContent?.includes('Datenschutz')) return true
        }
        return false
      },
      { timeout: 2000 }
    )
  } catch {
    /* kein Modal sichtbar */
  }

  const clicked = await page.evaluate(() => {
    for (const overlay of document.querySelectorAll('.modal-overlay')) {
      const title = overlay.querySelector('.modal-title')
      if (!title?.textContent?.includes('Datenschutz')) continue
      const btn = Array.from(overlay.querySelectorAll('button')).find((b) =>
        (b.textContent || '').trim().includes('Verstanden')
      )
      if (btn instanceof HTMLElement) {
        btn.click()
        return true
      }
    }
    return false
  })

  if (clicked) {
    await page
      .waitForFunction(
        () => {
          for (const el of document.querySelectorAll('.modal-overlay')) {
            const title = el.querySelector('.modal-title')
            if (title?.textContent?.includes('Datenschutz')) return false
          }
          return true
        },
        { timeout: 3000 }
      )
      .catch(() => undefined)
    await new Promise((r) => setTimeout(r, 250))
  }

  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach((el) => {
      const title = el.querySelector('.modal-title')
      if (title?.textContent?.includes('Datenschutz')) el.remove()
    })
    document.body.style.overflow = ''
  })
}

export async function authenticateDocsPage(page, baseUrl) {
  const { email, cookies } = await createDocsSession()
  const host = new URL(baseUrl).hostname

  await page.setCookie(
    ...cookies.map(({ name, value, ...rest }) => ({
      name,
      value,
      domain: host,
      path: rest.path ?? '/',
      httpOnly: rest.httpOnly ?? false,
      secure: false,
      sameSite: rest.sameSite ?? 'Lax',
    }))
  )

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await dismissBlockingModals(page)
  const path = new URL(page.url()).pathname

  if (path === '/login') {
    throw new Error(
      `Session-Cookies für ${email} wurden gesetzt, aber CRM zeigt weiter Login. Dev-Server auf ${baseUrl} prüfen.`
    )
  }
}

export async function verifyAuthenticatedFetch(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/anfragen`, { redirect: 'manual' })
    const loc = res.headers.get('location') ?? ''
    return !(res.status >= 300 && res.status < 400 && loc.includes('/login'))
  } catch {
    return false
  }
}

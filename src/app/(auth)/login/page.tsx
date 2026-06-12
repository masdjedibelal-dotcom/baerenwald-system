'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { BrandLogo } from '@/components/brand/BrandLogo'
import {
  requestCrmPasswordReset,
  verifyCrmStaffSession,
} from '@/app/(auth)/auth-actions'
import {
  CRM_LOGIN_INVALID_MESSAGE,
  CRM_LOGIN_PORTAL_ONLY_MESSAGE,
} from '@/lib/auth/crm-access'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const devError = searchParams.get('dev_error')
  const urlError = searchParams.get('error')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (urlError === 'portal_only') {
          await supabase.auth.signOut()
          setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
          return
        }
        const { data, error } = await supabase.auth.getUser()
        if (cancelled) return
        if (error || !data.user) return
        const crm = await verifyCrmStaffSession()
        if (!crm.ok) {
          await supabase.auth.signOut()
          setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
          return
        }
        router.replace('/')
      } catch {
        // Supabase nicht erreichbar → User bleibt auf /login.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase, urlError])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)

    const normalizedEmail = email.trim().toLowerCase()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signError) {
      setError(CRM_LOGIN_INVALID_MESSAGE)
      setLoading(false)
      return
    }

    const crm = await verifyCrmStaffSession()
    if (!crm.ok) {
      await supabase.auth.signOut()
      setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
      setLoading(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  const handleForgot = async () => {
    setLoading(true)
    setError(null)
    setInfo(null)
    const res = await requestCrmPasswordReset(email)
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setInfo(
      'Falls ein CRM-Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen — der führt ins CRM, nicht zu MeinBärenwald.'
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bw-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-bw-bg p-2">
            <BrandLogo variant="green" height={40} priority />
          </div>
          <h1 className="text-xl font-semibold text-bw-text">Bärenwald CRM</h1>
          <p className="mt-1 text-sm text-bw-light">München — nur für Team-Zugänge</p>
        </div>

        <Card>
          <div className="space-y-4">
            {mode === 'login' ? (
              <>
                <div>
                  <label className="input-label">E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="name@baerenwald-muenchen.de"
                    autoComplete="email"
                    onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                  />
                </div>

                <div>
                  <label className="input-label">Passwort</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                  />
                </div>

                <button
                  type="button"
                  className="text-left text-sm text-bw-link underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode('forgot')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  Passwort vergessen?
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-bw-text-muted">
                  CRM-Passwort zurücksetzen — der Link führt zur CRM-URL, nicht zur Website
                  MeinBärenwald.
                </p>
                <div>
                  <label className="input-label">CRM-E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="name@baerenwald-muenchen.de"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="button"
                  className="text-sm text-bw-link underline-offset-2 hover:underline"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  ← Zurück zum Login
                </button>
              </>
            )}

            {devError ? (
              <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
                Dev-Auto-Login fehlgeschlagen: {decodeURIComponent(devError)}
              </div>
            ) : null}
            {urlError ? (
              <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
                Anmeldung fehlgeschlagen: {decodeURIComponent(urlError)}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{info}</div>
            ) : null}

            <button
              type="button"
              onClick={() => void (mode === 'login' ? handleLogin() : handleForgot())}
              disabled={loading || !email.trim() || (mode === 'login' && !password)}
              className="btn btn-primary btn-lg w-full"
            >
              {loading
                ? 'Bitte warten…'
                : mode === 'login'
                  ? 'Anmelden'
                  : 'Reset-Link senden'}
            </button>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-bw-text-muted">
          MeinBärenwald / Partner-Portal:{' '}
          <a
            href="https://baerenwaldmuenchen.de/portal/login"
            className="text-bw-link underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            baerenwaldmuenchen.de
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bw-bg px-4">
          <p className="text-sm text-bw-light">Laden…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

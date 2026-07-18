'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
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
    <div className="login-screen">
      <div className="login-screen__inner">
        <div className="login-screen__brand">
          <div className="login-screen__logo">
            <BrandLogo variant="green" height={40} priority />
          </div>
          <div className="login-screen__title">Bärenwald CRM</div>
          <div className="login-screen__sub">München</div>
        </div>

        <div className="card login-screen__card">
          <div className="login-screen__form">
            {mode === 'login' ? (
              <>
                <div>
                  <label className="input-label" htmlFor="crm-login-email">
                    E-Mail
                  </label>
                  <input
                    id="crm-login-email"
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
                  <label className="input-label" htmlFor="crm-login-password">
                    Passwort
                  </label>
                  <input
                    id="crm-login-password"
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
                  className="login-screen__forgot"
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
                <p className="login-screen__hint">
                  CRM-Passwort zurücksetzen — der Link führt zur CRM-URL, nicht zur Website
                  MeinBärenwald.
                </p>
                <div>
                  <label className="input-label" htmlFor="crm-forgot-email">
                    CRM-E-Mail
                  </label>
                  <input
                    id="crm-forgot-email"
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
                  className="login-screen__forgot"
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
              <div className="login-screen__alert login-screen__alert--error">
                Dev-Auto-Login fehlgeschlagen: {decodeURIComponent(devError)}
              </div>
            ) : null}
            {urlError && urlError !== 'portal_only' ? (
              <div className="login-screen__alert login-screen__alert--error">
                Anmeldung fehlgeschlagen: {decodeURIComponent(urlError)}
              </div>
            ) : null}
            {error ? (
              <div className="login-screen__alert login-screen__alert--error">{error}</div>
            ) : null}
            {info ? (
              <div className="login-screen__alert login-screen__alert--ok">{info}</div>
            ) : null}

            <button
              type="button"
              onClick={() => void (mode === 'login' ? handleLogin() : handleForgot())}
              disabled={loading || !email.trim() || (mode === 'login' && !password)}
              className="btn primary w-full"
            >
              {loading
                ? 'Bitte warten…'
                : mode === 'login'
                  ? 'Anmelden'
                  : 'Reset-Link senden'}
            </button>

            {mode === 'login' ? (
              <div className="login-screen__demo">
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    document.getElementById('crm-login-email')?.focus()
                  }}
                >
                  Direkt zur Demo →
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <p className="login-screen__footer">
          🇩🇪 Server in Deutschland · DSGVO-konform · verschlüsselt
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-screen">
          <p className="login-screen__loading">Laden…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

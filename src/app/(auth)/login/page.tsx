'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  requestCrmPasswordReset,
  verifyCrmStaffSession,
} from '@/app/(auth)/auth-actions'
import {
  CRM_LOGIN_INVALID_MESSAGE,
  CRM_LOGIN_PORTAL_ONLY_MESSAGE,
} from '@/lib/auth/crm-access'
import { cn } from '@/lib/utils'

const BENEFITS: { icon: string; text: string }[] = [
  { icon: 'folders', text: 'Alle Vorgänge – von Anfrage bis Rechnung an einem Ort' },
  { icon: 'users', text: 'Kunden, Handwerker & Partner immer griffbereit' },
  { icon: 'calendar', text: 'Termine, Angebote & Aufträge im Überblick' },
]

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
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
          await supabase.auth.signOut({ scope: 'local' })
          setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
          return
        }
        if (urlError === 'session') {
          setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.')
          return
        }
        if (urlError === 'idle') {
          setError('Du wurdest wegen Inaktivität abgemeldet. Bitte melde dich erneut an.')
          return
        }
        const { data, error: userErr } = await supabase.auth.getUser()
        if (cancelled) return
        if (userErr || !data.user) return
        const crm = await verifyCrmStaffSession()
        if (!crm.ok) {
          await supabase.auth.signOut({ scope: 'local' })
          setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
          return
        }
        router.replace('/')
      } catch {
        /* offline → Login bleibt */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase, urlError])

  async function handleLogin() {
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
      await supabase.auth.signOut({ scope: 'local' })
      setError(CRM_LOGIN_PORTAL_ONLY_MESSAGE)
      setLoading(false)
      return
    }

    void remember
    router.replace('/')
    router.refresh()
  }

  async function handleForgot() {
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
      'Falls ein CRM-Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen.'
    )
  }

  function openForgot() {
    setMode('forgot')
    setError(null)
    setInfo(null)
  }

  return (
    <div className="crm-login">
      <aside className="crm-login__brand">
        <div className="crm-login__brand-head">
          <div className="crm-login__brand-mark" aria-hidden>
            <BrandLogo variant="green" height={22} priority />
          </div>
          <div>
            <div className="crm-login__brand-name">Bärenwald</div>
            <div className="crm-login__brand-sub">CRM · München</div>
          </div>
        </div>

        <div className="crm-login__brand-copy">
          <h1 className="crm-login__headline">
            Alles im Griff.
            <br />
            Vom Anruf bis zur Rechnung.
          </h1>
          <p className="crm-login__lead">
            Ihr Arbeitsplatz für den ganzen Tag – Vorgänge, Kunden und Termine an einem Ort, schnell
            erledigt.
          </p>
          <ul className="crm-login__benefits">
            {BENEFITS.map((b) => (
              <li key={b.text}>
                <span className="crm-login__benefit-ico" aria-hidden>
                  <MockIcon ctx="btn" n={b.icon} size={16} />
                </span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="crm-login__panel">
        <div className="crm-login__form-wrap">
          <div className="crm-login__mobile-brand">
            <div className="crm-login__brand-mark" aria-hidden>
              <BrandLogo variant="green" height={22} priority />
            </div>
            <div>
              <div className="crm-login__brand-name">Bärenwald</div>
              <div className="crm-login__brand-sub">CRM · München</div>
            </div>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="crm-login__welcome">Willkommen zurück</h2>
              <p className="crm-login__welcome-sub">Melde dich mit deinem Konto an.</p>

              <div className="crm-login__fields">
                <div className="crm-login__field">
                  <label className="crm-login__label" htmlFor="crm-login-email">
                    E-Mail
                  </label>
                  <div className="crm-login__input-wrap">
                    <MockIcon ctx="btn" n="mail" size={16} className="crm-login__input-ico" />
                    <input
                      id="crm-login-email"
                      className="crm-login__input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="b.baerenwald@crm.de"
                      autoComplete="email"
                      onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                    />
                  </div>
                </div>

                <div className="crm-login__field">
                  <label className="crm-login__label" htmlFor="crm-login-password">
                    Passwort
                  </label>
                  <div className="crm-login__input-wrap">
                    <input
                      id="crm-login-password"
                      className="crm-login__input crm-login__input--plain"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
                    />
                    <button
                      type="button"
                      className="crm-login__eye"
                      aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <MockIcon ctx="btn" n="eye" size={16} />
                    </button>
                  </div>
                </div>

                <div className="crm-login__row">
                  <label className="crm-login__remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Angemeldet bleiben</span>
                  </label>
                  <button type="button" className="crm-login__link" onClick={openForgot}>
                    Passwort vergessen?
                  </button>
                </div>

                {devError ? (
                  <div className="crm-login__alert crm-login__alert--error">
                    Dev-Auto-Login fehlgeschlagen: {decodeURIComponent(devError)}
                  </div>
                ) : null}
                {urlError && urlError !== 'portal_only' ? (
                  <div className="crm-login__alert crm-login__alert--error">
                    Anmeldung fehlgeschlagen: {decodeURIComponent(urlError)}
                  </div>
                ) : null}
                {error ? (
                  <div className="crm-login__alert crm-login__alert--error">{error}</div>
                ) : null}

                <button
                  type="button"
                  className={cn('crm-login__submit', loading && 'is-loading')}
                  disabled={loading || !email.trim() || !password}
                  onClick={() => void handleLogin()}
                >
                  {loading ? 'Bitte warten…' : 'Anmelden'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="crm-login__welcome">Passwort zurücksetzen</h2>
              <p className="crm-login__welcome-sub">
                Wir senden einen Link an deine CRM-E-Mail.
              </p>

              <div className="crm-login__fields">
                <div className="crm-login__field">
                  <label className="crm-login__label" htmlFor="crm-forgot-email">
                    E-Mail
                  </label>
                  <div className="crm-login__input-wrap">
                    <MockIcon ctx="btn" n="mail" size={16} className="crm-login__input-ico" />
                    <input
                      id="crm-forgot-email"
                      className="crm-login__input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="b.baerenwald@crm.de"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="crm-login__alert crm-login__alert--error">{error}</div>
                ) : null}
                {info ? (
                  <div className="crm-login__alert crm-login__alert--ok">{info}</div>
                ) : null}

                <button
                  type="button"
                  className="crm-login__submit"
                  disabled={loading || !email.trim()}
                  onClick={() => void handleForgot()}
                >
                  {loading ? 'Bitte warten…' : 'Reset-Link senden'}
                </button>

                <button
                  type="button"
                  className="crm-login__back"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  ← Zurück zum Login
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="crm-login crm-login--loading">
          <div className="crm-login__brand-mark" aria-hidden>
            <BrandLogo variant="green" height={22} priority />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

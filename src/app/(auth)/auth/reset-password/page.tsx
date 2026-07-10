'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { verifyCrmStaffSession } from '@/app/(auth)/auth-actions'

function ResetPasswordContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const code = searchParams.get('code')
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeErr && !cancelled) {
          setError(
            'Link abgelaufen oder ungültig. Bitte erneut „Passwort vergessen“ im CRM anfordern.'
          )
          setChecking(false)
          return
        }
        if (!cancelled) {
          router.replace('/auth/reset-password')
        }
      }

      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (!data.user) {
        setError(
          'Keine gültige Sitzung — bitte den Link aus der E-Mail erneut öffnen oder „Passwort vergessen“ im CRM nutzen.'
        )
        setChecking(false)
        return
      }
      const crm = await verifyCrmStaffSession()
      if (!crm.ok) {
        await supabase.auth.signOut()
        setError(crm.message)
        setChecking(false)
        return
      }
      setReady(true)
      setChecking(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router, searchParams, supabase])

  async function handleSave() {
    if (password.length < 8) {
      setError('Mindestens 8 Zeichen.')
      return
    }
    if (password !== password2) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: updErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bw-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-bw-bg p-2">
            <BrandLogo variant="green" height={40} priority />
          </div>
          <h1 className="text-xl font-semibold text-bw-text">Neues CRM-Passwort</h1>
        </div>
        <Card>
          {checking ? (
            <p className="text-sm text-bw-text-muted">Link wird geprüft…</p>
          ) : !ready ? (
            <div className="space-y-3">
              <p className="text-sm text-bw-text-muted">{error}</p>
              <a href="/login" className="btn btn-primary btn-lg w-full text-center">
                Zum CRM-Login
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="input-label">Neues Passwort</span>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="block">
                <span className="input-label">Passwort wiederholen</span>
                <input
                  type="password"
                  className="input"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              {error ? (
                <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
                  {error}
                </div>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
                onClick={() => void handleSave()}
              >
                {loading ? 'Speichere…' : 'Passwort speichern'}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function CrmResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Laden…</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

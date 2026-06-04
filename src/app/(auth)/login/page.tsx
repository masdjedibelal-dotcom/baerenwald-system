'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { BrandLogo } from '@/components/brand/BrandLogo'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const devError = searchParams.get('dev_error')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // getUser() validiert gegen Supabase-Server; bei DNS-/Netzwerkfehler wirft es,
        // so dass wir KEIN Auto-Redirect machen → kein Loop mit der Middleware.
        const { data, error } = await supabase.auth.getUser()
        if (cancelled) return
        if (error || !data.user) return
        router.replace('/')
      } catch {
        // Supabase nicht erreichbar → User bleibt auf /login.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signError) {
      setError('E-Mail oder Passwort falsch.')
      setLoading(false)
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
          <h1 className="text-xl font-semibold text-bw-text">Bärenwald CRM</h1>
          <p className="mt-1 text-sm text-bw-light">München</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="input-label">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="name@beispiel.de"
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

            {devError ? (
              <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">
                Dev-Auto-Login fehlgeschlagen: {decodeURIComponent(devError)}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-lg bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">{error}</div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading || !email || !password}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </div>
        </Card>
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

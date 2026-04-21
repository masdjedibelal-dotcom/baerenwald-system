'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session?.user) {
        router.replace('/')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase.auth])

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
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-bw-accent text-xl font-bold text-white">
            B
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

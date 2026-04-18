'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signError) {
        setError(signError.message)
        setLoading(false)
        return
      }
      router.replace('/')
      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-white">
          B
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink">Bärenwald CRM</h1>
          <p className="text-sm text-muted">Bitte anmelden</p>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          label="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          label="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error ? (
        <p
          className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        Anmelden
      </Button>
    </form>
  )
}

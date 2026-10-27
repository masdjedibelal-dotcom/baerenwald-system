'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { completeAuthCallback } from '@/app/auth/callback/complete-auth-callback'

/**
 * Sichtbarer Splash während Server-Code-Exchange (Invite / Magic / Recovery).
 * Exchange läuft serverseitig — kein clientseitiges exchangeCodeForSession (PKCE).
 */
function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [err, setErr] = useState<string | null>(null)
  // Einmal-Link (token_hash/code) nur einmal einlösen — ein zweiter Lauf (z. B. StrictMode) würde ihn als „abgelaufen“ melden
  const gestartet = useRef(false)

  useEffect(() => {
    if (gestartet.current) return
    gestartet.current = true
    void (async () => {
      const res = await completeAuthCallback({
        code: searchParams.get('code'),
        tokenHash: searchParams.get('token_hash'),
        type: searchParams.get('type'),
        next: searchParams.get('next'),
      })
      if (!res.ok) setErr(res.message)
      router.replace(res.redirect)
    })()
  }, [router, searchParams])

  return (
    <div
      className="crm-login crm-login--loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Anmeldung wird abgeschlossen"
    >
      <div className="crm-login__busy">
        <div className="crm-login__brand-mark" aria-hidden>
          <BrandLogo variant="green" height={22} priority />
        </div>
        <span className="crm-login__busy-spinner" aria-hidden />
        <span className="crm-login__busy-label">
          {err ? 'Weiterleitung…' : 'Anmeldung wird abgeschlossen…'}
        </span>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="crm-login crm-login--loading"
          role="status"
          aria-busy="true"
          aria-label="Anmeldung wird abgeschlossen"
        >
          <div className="crm-login__busy">
            <div className="crm-login__brand-mark" aria-hidden>
              <BrandLogo variant="green" height={22} priority />
            </div>
            <span className="crm-login__busy-spinner" aria-hidden />
            <span className="crm-login__busy-label">Anmeldung wird abgeschlossen…</span>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Hält die Supabase-Session im CRM aktiv:
 * - Token-Refresh → Server-Components neu laden
 * - Sign-Out / abgelaufene Session → Login
 * - Tab wieder sichtbar → Session prüfen (verhindert „Listen = 0“ nach Idle)
 */
export function SessionKeepAlive() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function ensureSession(redirectIfMissing: boolean) {
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !data.user) {
        if (redirectIfMissing) {
          window.location.href = '/login?error=session'
        }
        return
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login?error=session'
        return
      }
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        router.refresh()
      }
    })

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      void ensureSession(true).then(() => {
        if (!cancelled) router.refresh()
      })
    }

    // Proaktiv: Access-Token (~1h) rechtzeitig refreshen
    const ping = window.setInterval(() => {
      void ensureSession(false)
    }, 20 * 60 * 1000)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [router])

  return null
}

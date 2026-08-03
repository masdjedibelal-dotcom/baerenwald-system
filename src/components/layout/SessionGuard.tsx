'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import {
  IDLE_COUNTDOWN_SEC,
  IDLE_WARN_MS,
  REFRESH_MIN_INTERVAL_MS,
  SESSION_PING_MS,
} from '@/lib/auth/session-guard-config'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

type ModalKind = 'idle' | 'expired'

type ModalState = {
  kind: ModalKind
  /** Sekunden bis Auto-Aktion */
  secondsLeft: number
}

/**
 * Session + Idle-Schutz fürs CRM:
 * - Abgelaufene Session → Modal → Logout
 * - Lange Inaktivität → Warn-Modal mit Countdown → Logout
 * - Weniger blinde router.refresh()-Stürme nach Tab-Fokus / Token-Refresh
 *
 * Wichtig: SIGNED_OUT / fehlendes getUser kurz nach Tab-Wechsel nicht sofort als
 * Logout werten (Portal auf gleichem Host kann Cookies kurz überschreiben / Race).
 */
export function SessionGuard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)

  const lastActivityRef = useRef(Date.now())
  const lastRefreshRef = useRef(0)
  const loggingOutRef = useRef(false)
  const modalRef = useRef(modal)
  modalRef.current = modal
  const dialogRef = useRef<HTMLDivElement>(null)

  const forceLogout = useCallback(async (reason: 'session' | 'idle') => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    try {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      /* trotzdem zur Login */
    }
    window.location.href = `/login?error=${reason}`
  }, [])

  const openExpired = useCallback(() => {
    setModal((cur) => {
      if (cur?.kind === 'expired') return cur
      return { kind: 'expired', secondsLeft: 12 }
    })
  }, [])

  /** Erst nach Bestätigung (mehrere Retries), dass wirklich keine Session mehr da ist. */
  const confirmMissingSession = useCallback(async () => {
    const supabase = createClient()
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, 350 + attempt * 250))
      const { data, error } = await supabase.auth.getUser()
      if (!error && data.user) return true
      // Kurz Token-Refresh versuchen, bevor wir aufgeben
      if (attempt < 2) {
        try {
          await supabase.auth.refreshSession()
        } catch {
          /* ignore */
        }
      }
    }
    openExpired()
    return false
  }, [openExpired])

  const softRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefreshRef.current < REFRESH_MIN_INTERVAL_MS) return
    lastRefreshRef.current = now
    router.refresh()
  }, [router])

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (modalRef.current?.kind === 'idle') {
      setModal(null)
    }
  }, [])

  const staySignedIn = useCallback(() => {
    lastActivityRef.current = Date.now()
    setModal(null)
  }, [])

  useEffect(() => setMounted(true), [])

  // Auth-Events + Ping + Tab-Fokus
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function ensureSession(opts: { onMissing: 'modal' | 'ignore' }) {
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return false
      if (error || !data.user) {
        if (opts.onMissing === 'modal') {
          const ok = await confirmMissingSession()
          return !cancelled && ok
        }
        return false
      }
      return true
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'SIGNED_OUT') {
        // Nicht sofort Logout — oft Race mit anderem Tab / Portal auf localhost
        void confirmMissingSession()
        return
      }
      if (event === 'TOKEN_REFRESHED') {
        return
      }
      if (event === 'SIGNED_IN') {
        softRefresh()
      }
    })

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      // Aktivität zurücksetzen: kurzer Portal-Besuch soll kein Idle auslösen
      lastActivityRef.current = Date.now()
      void ensureSession({ onMissing: 'modal' }).then((ok) => {
        if (ok && !cancelled) softRefresh()
      })
    }

    const ping = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void ensureSession({ onMissing: 'modal' })
    }, SESSION_PING_MS)

    const onCrmExpired = () => openExpired()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    window.addEventListener('crm-session-expired', onCrmExpired)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
      window.removeEventListener('crm-session-expired', onCrmExpired)
    }
  }, [confirmMissingSession, openExpired, softRefresh])

  // Idle-Tracking
  useEffect(() => {
    const bump = () => {
      if (modalRef.current?.kind === 'expired') return
      markActivity()
    }
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('pointerdown', bump, opts)
    window.addEventListener('keydown', bump, opts)
    window.addEventListener('touchstart', bump, opts)
    window.addEventListener('scroll', bump, opts)

    const tick = window.setInterval(() => {
      if (modalRef.current) return
      if (document.visibilityState === 'hidden') return
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor >= IDLE_WARN_MS) {
        setModal({ kind: 'idle', secondsLeft: IDLE_COUNTDOWN_SEC })
      }
    }, 15_000)

    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('touchstart', bump)
      window.removeEventListener('scroll', bump)
      window.clearInterval(tick)
    }
  }, [markActivity])

  // Countdown im Modal
  useEffect(() => {
    if (!modal) return
    if (modal.secondsLeft <= 0) {
      void forceLogout(modal.kind === 'idle' ? 'idle' : 'session')
      return
    }
    const t = window.setTimeout(() => {
      setModal((cur) =>
        cur ? { ...cur, secondsLeft: Math.max(0, cur.secondsLeft - 1) } : null
      )
    }, 1000)
    return () => window.clearTimeout(t)
  }, [modal, forceLogout])

  // Focus-Trap für Modal
  useEffect(() => {
    if (!modal || !mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const release = dialog
      ? trapFocus(dialog, () => {
          if (modalRef.current?.kind === 'idle') staySignedIn()
        })
      : undefined
    return () => {
      document.body.style.overflow = prev
      release?.()
    }
  }, [modal, mounted, staySignedIn])

  if (!mounted || !modal) return null

  const isIdle = modal.kind === 'idle'
  const title = isIdle ? 'Noch angemeldet?' : 'Sitzung abgelaufen'
  const body = isIdle
    ? `Du warst länger inaktiv. In ${modal.secondsLeft} Sekunden wirst du automatisch abgemeldet.`
    : `Deine Sitzung ist nicht mehr gültig. Du wirst in ${modal.secondsLeft} Sekunden zur Anmeldung weitergeleitet.`

  return createPortal(
    <div className="confirm-popup-overlay session-guard-overlay" role="presentation">
      <div
        ref={dialogRef}
        className="confirm-popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-guard-title"
        tabIndex={-1}
      >
        <div className="confirm-popup__body">
          <h2 id="session-guard-title" className="confirm-popup__title">
            {title}
          </h2>
          <div className="confirm-popup__text">{body}</div>
        </div>
        <div
          className={cn(
            'confirm-popup__footer',
            isIdle && 'confirm-popup__footer--danger'
          )}
        >
          {isIdle ? (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => void forceLogout('idle')}
              >
                Abmelden
              </Button>
              <Button type="button" variant="primary" onClick={staySignedIn}>
                Weiterarbeiten
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={() => void forceLogout('session')}
            >
              Zur Anmeldung
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Andere Stellen können Session-Ablauf zentral melden. */
export function emitCrmSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('crm-session-expired'))
}

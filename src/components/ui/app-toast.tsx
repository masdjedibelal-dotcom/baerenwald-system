'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { actionBusy } from '@/components/ui/action-busy'
import { systemErrorMessage, isLikelyOfflineError } from '@/lib/copy/errors'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'loading'

export type ToastAction = {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
}

type ToastOpts = {
  id?: string
  persist?: boolean
  action?: ToastAction
  /** Überschreibt Default-Timeout (ms). Action-Toasts: Default 5000. */
  durationMs?: number
}

type ToastApi = {
  push: (type: ToastType, message: string, opts?: ToastOpts) => string
  dismiss: (id: string) => void
}

let toastApi: ToastApi | null = null
/** loading-Toasts, die ein actionBusy.show ausgelöst haben */
const loadingBusyIds = new Set<string>()

function formatMessage(title: string, opts?: { description?: string }): string {
  if (opts?.description) return `${title} — ${opts.description}`
  return title
}

function releaseLoadingBusy(id: string) {
  if (!loadingBusyIds.has(id)) return
  loadingBusyIds.delete(id)
  actionBusy.hide()
}

function pushToast(type: ToastType, message: string, opts?: ToastOpts): string {
  if (!toastApi) return ''
  return toastApi.push(type, message, opts)
}

export const toast = {
  success: (
    msg: string,
    opts?: { id?: string; action?: ToastAction; durationMs?: number }
  ) => {
    if (opts?.id) releaseLoadingBusy(opts.id)
    return pushToast('success', msg, {
      id: opts?.id,
      action: opts?.action,
      persist: Boolean(opts?.action),
      durationMs: opts?.durationMs,
    })
  },
  /**
   * Lösch-Toast: „Gelöscht“ + „Rückgängig“, Standard 5 s.
   */
  deleted: (opts: {
    message?: string
    onUndo: () => void
    durationMs?: number
    id?: string
  }) => {
    if (opts.id) releaseLoadingBusy(opts.id)
    return pushToast('success', opts.message ?? 'Gelöscht', {
      id: opts.id,
      persist: true,
      durationMs: opts.durationMs ?? 5000,
      action: { label: 'Rückgängig', onClick: opts.onUndo },
    })
  },
  error: (msg: string, opts?: { id?: string; action?: ToastAction; durationMs?: number }) => {
    if (opts?.id) releaseLoadingBusy(opts.id)
    return pushToast('error', msg, {
      id: opts?.id,
      action: opts?.action,
      persist: Boolean(opts?.action),
      durationMs: opts?.durationMs,
    })
  },
  /**
   * Schwaches Netz / Speichern fehlgeschlagen — Eingaben bleiben, Retry-Aktion.
   */
  offlineRetry: (onRetry?: () => void, opts?: { id?: string }) => {
    if (opts?.id) releaseLoadingBusy(opts.id)
    return pushToast('error', 'Keine Verbindung – Erneut versuchen', {
      id: opts?.id ?? 'offline-retry',
      persist: Boolean(onRetry),
      durationMs: onRetry ? 8000 : 5000,
      action: onRetry
        ? {
            label: 'Erneut versuchen',
            onClick: onRetry,
          }
        : undefined,
    })
  },
  /**
   * System-/Netzwerkfehler: Technik → logDbError, Nutzer → userMessage.
   * Validierung gehört an Felder — nicht hier.
   */
  systemError: (
    error: unknown,
    context = 'toast',
    fallback?: string,
    opts?: { onRetry?: () => void }
  ) => {
    const msg = systemErrorMessage(error, context, fallback)
    if (isLikelyOfflineError(error) || msg.includes('Keine Verbindung')) {
      return toast.offlineRetry(opts?.onRetry)
    }
    return pushToast('error', msg)
  },
  info: (msg: string, opts?: { id?: string; action?: ToastAction }) => {
    if (opts?.id) releaseLoadingBusy(opts.id)
    return pushToast('info', msg, { id: opts?.id, action: opts?.action })
  },
  /**
   * Feedback nach stiller Auto-Speicherung (X / Close ohne explizites Speichern).
   * Gleiche id → ersetzt vorherigen Auto-Save-Toast (kein Stapeln).
   */
  autoSaved: (opts?: { label?: string }) => {
    const label = opts?.label?.trim()
    const message = label ? `${label} gespeichert` : 'Änderungen gespeichert'
    return pushToast('success', message, { id: 'auto-saved' })
  },
  /** Bleibt stehen, bis dismiss/success/error mit derselben id — inkl. Loading-Screen. */
  loading: (msg: string, opts?: { id?: string }) => {
    const id = pushToast('loading', msg, { id: opts?.id, persist: true })
    if (id && !loadingBusyIds.has(id)) {
      loadingBusyIds.add(id)
      actionBusy.show(msg)
    }
    return id
  },
  dismiss: (id: string) => {
    releaseLoadingBusy(id)
    toastApi?.dismiss(id)
  },
  message: (title: string, opts?: { description?: string }) =>
    pushToast('info', formatMessage(title, opts)),
}

const icons = {
  success: 'circle-check-filled',
  error: 'circle-x',
  info: 'info-circle',
  loading: 'hourglass',
} as const

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((type: ToastType, message: string, opts?: ToastOpts) => {
    const id = opts?.id ?? Math.random().toString(36).slice(2)
    setToasts((prev) => {
      const without = prev.filter((t) => t.id !== id)
      return [...without, { id, type, message, action: opts?.action }]
    })
    const persist = opts?.persist || type === 'loading' || Boolean(opts?.action)
    if (!persist) {
      const ms = opts?.durationMs ?? (type === 'error' ? 5000 : 3000)
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, ms)
    } else if (opts?.action && type !== 'loading') {
      const ms = opts?.durationMs ?? 5000
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, ms)
    }
    return id
  }, [])

  useEffect(() => {
    toastApi = { push, dismiss }
    return () => {
      toastApi = null
    }
  }, [push, dismiss])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-toast flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-4"
      aria-live="polite"
    >
      <div className="flex w-[min(100%,28rem)] flex-col items-stretch gap-2">
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              className={cn(
                'app-toast pointer-events-auto flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium shadow-lg animate-slide-up',
                t.type === 'success' && 'app-toast--success',
                t.type === 'error' && 'app-toast--error',
                (t.type === 'info' || t.type === 'loading') && 'app-toast--info'
              )}
              role="status"
              aria-live={t.type === 'loading' ? 'polite' : 'assertive'}
            >
              <MockIcon
                n={icons[t.type]}
                ctx="default"
                className={cn('h-5 w-5 shrink-0', t.type === 'loading' && 'animate-spin')}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  className="shrink-0 rounded-button px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
              {t.type !== 'loading' ? (
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="text-current opacity-60 hover:opacity-100"
                  aria-label="Schließen"
                >
                  <MockIcon n="x" ctx="default" className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

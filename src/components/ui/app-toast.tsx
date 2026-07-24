'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'loading'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

type ToastApi = {
  push: (type: ToastType, message: string, opts?: { id?: string; persist?: boolean }) => string
  dismiss: (id: string) => void
}

let toastApi: ToastApi | null = null

function formatMessage(title: string, opts?: { description?: string }): string {
  if (opts?.description) return `${title} — ${opts.description}`
  return title
}

function pushToast(
  type: ToastType,
  message: string,
  opts?: { id?: string; persist?: boolean }
): string {
  if (!toastApi) return ''
  return toastApi.push(type, message, opts)
}

export const toast = {
  success: (msg: string, opts?: { id?: string }) =>
    pushToast('success', msg, { id: opts?.id }),
  error: (msg: string, opts?: { id?: string }) =>
    pushToast('error', msg, { id: opts?.id }),
  info: (msg: string, opts?: { id?: string }) =>
    pushToast('info', msg, { id: opts?.id }),
  /** Bleibt stehen, bis dismiss/success/error mit derselben id. */
  loading: (msg: string, opts?: { id?: string }) =>
    pushToast('loading', msg, { id: opts?.id, persist: true }),
  dismiss: (id: string) => toastApi?.dismiss(id),
  message: (title: string, opts?: { description?: string }) =>
    pushToast('info', formatMessage(title, opts)),
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  loading: Loader2,
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type: ToastType, message: string, opts?: { id?: string; persist?: boolean }) => {
      const id = opts?.id ?? Math.random().toString(36).slice(2)
      setToasts((prev) => {
        const without = prev.filter((t) => t.id !== id)
        return [...without, { id, type, message }]
      })
      const persist = opts?.persist || type === 'loading'
      if (!persist) {
        const ms = type === 'error' ? 5000 : 3000
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, ms)
      }
      return id
    },
    []
  )

  useEffect(() => {
    toastApi = { push, dismiss }
    return () => {
      toastApi = null
    }
  }, [push, dismiss])

  return (
    <div
      className="pointer-events-none fixed right-4 top-14 z-toast flex w-full max-w-md flex-col gap-2 px-4 md:top-16 md:px-0"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'app-toast pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg animate-slide-up',
              t.type === 'success' && 'app-toast--success',
              t.type === 'error' && 'app-toast--error',
              (t.type === 'info' || t.type === 'loading') && 'app-toast--info'
            )}
            role="status"
            aria-live={t.type === 'loading' ? 'polite' : 'assertive'}
          >
            <Icon
              className={cn('h-5 w-5 shrink-0', t.type === 'loading' && 'animate-spin')}
              aria-hidden
            />
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.type !== 'loading' ? (
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-current opacity-60 hover:opacity-100"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

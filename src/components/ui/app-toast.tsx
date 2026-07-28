'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X, Loader2 } from 'lucide-react'
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

type ToastOpts = { id?: string; persist?: boolean; action?: ToastAction }

type ToastApi = {
  push: (type: ToastType, message: string, opts?: ToastOpts) => string
  dismiss: (id: string) => void
}

let toastApi: ToastApi | null = null

function formatMessage(title: string, opts?: { description?: string }): string {
  if (opts?.description) return `${title} — ${opts.description}`
  return title
}

function pushToast(type: ToastType, message: string, opts?: ToastOpts): string {
  if (!toastApi) return ''
  return toastApi.push(type, message, opts)
}

export const toast = {
  success: (msg: string, opts?: { id?: string; action?: ToastAction }) =>
    pushToast('success', msg, { id: opts?.id, action: opts?.action, persist: Boolean(opts?.action) }),
  error: (msg: string, opts?: { id?: string; action?: ToastAction }) =>
    pushToast('error', msg, { id: opts?.id, action: opts?.action }),
  info: (msg: string, opts?: { id?: string; action?: ToastAction }) =>
    pushToast('info', msg, { id: opts?.id, action: opts?.action }),
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

  const push = useCallback((type: ToastType, message: string, opts?: ToastOpts) => {
    const id = opts?.id ?? Math.random().toString(36).slice(2)
    setToasts((prev) => {
      const without = prev.filter((t) => t.id !== id)
      return [...without, { id, type, message, action: opts?.action }]
    })
    const persist = opts?.persist || type === 'loading' || Boolean(opts?.action)
    if (!persist) {
      const ms = type === 'error' ? 5000 : 3000
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, ms)
    } else if (opts?.action && type !== 'loading') {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 8000)
    }
    return id
  }, [])

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
            {t.action ? (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
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
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

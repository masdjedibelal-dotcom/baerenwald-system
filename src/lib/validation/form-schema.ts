/**
 * Zod-Formularvalidierung → Feldfehler + Fokus auf erstes Fehlerfeld.
 */
'use client'

import { useCallback, useState } from 'react'
import type { z } from 'zod'

export type FieldErrors = Record<string, string>

export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: FieldErrors } {
  const r = schema.safeParse(data)
  if (r.success) return { ok: true, data: r.data }
  return { ok: false, fieldErrors: fieldErrorsFromZod(r.error) }
}

/** Scrollt/fokusiert das erste [data-field=…] bzw. [name=…] mit Fehler. */
export function focusFirstFieldError(fieldErrors: FieldErrors, root?: HTMLElement | null): void {
  const keys = Object.keys(fieldErrors)
  if (!keys.length) return
  const scope = root ?? (typeof document !== 'undefined' ? document.body : null)
  if (!scope) return
  for (const key of keys) {
    const el =
      (scope.querySelector(`[data-field="${CSS.escape(key)}"]`) as HTMLElement | null) ||
      (scope.querySelector(`[name="${CSS.escape(key)}"]`) as HTMLElement | null)
    if (!el) continue
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const focusable =
      el.matches('input,select,textarea,button')
        ? el
        : (el.querySelector('input,select,textarea,button') as HTMLElement | null)
    focusable?.focus?.()
    return
  }
}

export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const clearFieldErrors = useCallback(() => setFieldErrors({}), [])
  const clearField = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])
  const applyFieldErrors = useCallback((errors: FieldErrors, root?: HTMLElement | null) => {
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      queueMicrotask(() => focusFirstFieldError(errors, root))
    }
  }, [])
  return { fieldErrors, setFieldErrors, clearFieldErrors, clearField, applyFieldErrors }
}

/**
 * Lokaler Zwischenstand für lange Formulare (localStorage).
 * Fotos/Files werden nicht persistiert — nur Upload-IDs / https-URLs.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const ZWISCHENSTAND_HINT = 'Zwischengespeichert'

type Envelope<T> = {
  v: 1
  savedAt: string
  data: T
}

const MAX_DATA_URL_CHARS = 80_000

/** Entfernt File/Blob; kürzt riesige data:-URLs (außer kurzen Signaturen). */
export function sanitizeDraftValue(value: unknown, keyHint = ''): unknown {
  if (value == null) return value
  if (typeof File !== 'undefined' && value instanceof File) return undefined
  if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof File !== 'undefined' && value[0] instanceof File) {
      return []
    }
    const out: unknown[] = []
    for (const item of value) {
      const s = sanitizeDraftValue(item, keyHint)
      if (s !== undefined) out.push(s)
    }
    return out
  }
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > MAX_DATA_URL_CHARS) {
      /* Signaturen oft data: — behalten wenn Feldname passt und unter Limit; sonst drop */
      if (!/sig|signatur|signature/i.test(keyHint)) return undefined
    }
    return value
  }
  if (typeof value !== 'object') return value
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'photos' || k === 'files' || k === 'fotoFiles') continue
    const s = sanitizeDraftValue(v, k)
    if (s !== undefined) out[k] = s
  }
  return out
}

export function formatZwischenstandClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function restoreDraftConfirmTitle(savedAtIso: string): string {
  return `Eingaben von ${formatZwischenstandClock(savedAtIso)} wiederherstellen?`
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readZwischenstand<T>(key: string): Envelope<T> | null {
  const s = storage()
  if (!s || !key) return null
  try {
    const raw = s.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope<T>
    if (!parsed || parsed.v !== 1 || !parsed.savedAt || parsed.data == null) return null
    return parsed
  } catch {
    return null
  }
}

export function writeZwischenstand<T>(key: string, data: T): string | null {
  const s = storage()
  if (!s || !key) return null
  const clean = sanitizeDraftValue(data) as T
  const env: Envelope<T> = {
    v: 1,
    savedAt: new Date().toISOString(),
    data: clean,
  }
  try {
    s.setItem(key, JSON.stringify(env))
    return env.savedAt
  } catch {
    /* Quota — Signaturen weglassen und erneut */
    try {
      const slim = sanitizeDraftValue(data) as Record<string, unknown>
      if (slim && typeof slim === 'object') {
        for (const k of Object.keys(slim)) {
          if (/sig|signatur|signature/i.test(k)) delete slim[k]
        }
      }
      const env2: Envelope<unknown> = {
        v: 1,
        savedAt: new Date().toISOString(),
        data: slim,
      }
      s.setItem(key, JSON.stringify(env2))
      return env2.savedAt
    } catch {
      return null
    }
  }
}

export function clearZwischenstand(key: string): void {
  const s = storage()
  if (!s || !key) return
  try {
    s.removeItem(key)
  } catch {
    /* ignore */
  }
}

export type UseFormZwischenstandOptions<T> = {
  /** Stabiler Schlüssel inkl. Vorgang/Objekt */
  storageKey: string
  enabled?: boolean
  /** Aktueller Snapshot (wird debounced geschrieben) */
  data: T
  /** Nach Bestätigung Draft anwenden */
  onRestore: (data: T) => void
  debounceMs?: number
}

export type UseFormZwischenstandResult = {
  promptOpen: boolean
  promptTitle: string
  acceptRestore: () => void
  declineRestore: () => void
  clear: () => void
  /** Dezent im Kopf: „Zwischengespeichert“ wenn kürzlich geschrieben */
  savedHint: string | null
}

/**
 * Beim Öffnen Restore-Prompt; danach Autosave; clear() nach Absenden.
 */
export function useFormZwischenstand<T>({
  storageKey,
  enabled = true,
  data,
  onRestore,
  debounceMs = 700,
}: UseFormZwischenstandOptions<T>): UseFormZwischenstandResult {
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptTitle, setPromptTitle] = useState('')
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [autosaveReady, setAutosaveReady] = useState(false)
  const pendingRef = useRef<T | null>(null)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextWrite = useRef(false)

  const clear = useCallback(() => {
    clearZwischenstand(storageKey)
    setSavedHint(null)
    pendingRef.current = null
  }, [storageKey])

  /* Mount / Key-Wechsel: Draft anbieten */
  useEffect(() => {
    setAutosaveReady(false)
    setPromptOpen(false)
    setSavedHint(null)
    pendingRef.current = null
    if (!enabled || !storageKey) {
      setAutosaveReady(true)
      return
    }
    const existing = readZwischenstand<T>(storageKey)
    if (existing) {
      pendingRef.current = existing.data
      setPromptTitle(restoreDraftConfirmTitle(existing.savedAt))
      setPromptOpen(true)
    } else {
      setAutosaveReady(true)
    }
  }, [enabled, storageKey])

  const acceptRestore = useCallback(() => {
    const d = pendingRef.current
    setPromptOpen(false)
    pendingRef.current = null
    if (d != null) {
      skipNextWrite.current = true
      onRestoreRef.current(d)
    }
    setAutosaveReady(true)
  }, [])

  const declineRestore = useCallback(() => {
    setPromptOpen(false)
    pendingRef.current = null
    clearZwischenstand(storageKey)
    setAutosaveReady(true)
  }, [storageKey])

  /* Debounced Autosave */
  useEffect(() => {
    if (!enabled || !storageKey || !autosaveReady || promptOpen) return
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    const t = window.setTimeout(() => {
      const at = writeZwischenstand(storageKey, data)
      if (!at) return
      setSavedHint(ZWISCHENSTAND_HINT)
      if (hintTimer.current) clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setSavedHint(null), 2500)
    }, debounceMs)
    return () => window.clearTimeout(t)
  }, [autosaveReady, data, debounceMs, enabled, promptOpen, storageKey])

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current)
    }
  }, [])

  return {
    promptOpen,
    promptTitle,
    acceptRestore,
    declineRestore,
    clear,
    savedHint,
  }
}

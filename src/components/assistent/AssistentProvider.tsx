'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import type { KiAssistDraft, KiAssistScopeId } from '@/lib/copilot/ki-assist-scopes'
import { getKiAssistScope } from '@/lib/copilot/ki-assist-scopes'

export type AssistentScopedSession = {
  scopeId: KiAssistScopeId
  /** Zusätzlicher Kontext (Dokument, Gewerk, …) */
  extraHint?: string | null
  /** Vorbelegung im Eingabefeld */
  draftInput?: string | null
  /**
   * over-sheet: über EditorSheet/Wizard (z-index), nach Übernehmen schließen.
   * Für kontextbezogene KI an Formularen.
   */
  layer?: 'default' | 'over-sheet'
}

/** Einmalige Auto-Analyse (z. B. Dashboard-KPIs) — öffnet Panel und sendet Prompt. */
export type AssistentAutoSession = {
  id: string
  title: string
  intro: string
  /** Zusätzlicher Kontext für den System-/Context-Hint */
  contextExtra: string
  /** Wird einmalig als User-Nachricht gesendet */
  autoPrompt: string
}

type AssistentContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  pathname: string
  /** Aktiver Editor-Kontext (null = allgemeiner Assistent) */
  scoped: AssistentScopedSession | null
  /** Öffnet Assistenten vorbereitet auf Scope (Position, Tagebuch, …) */
  openScoped: (session: AssistentScopedSession) => void
  clearScoped: () => void
  autoSession: AssistentAutoSession | null
  /** Öffnet Assistenten und startet Auto-Prompt (z. B. KPI-Analyse) */
  openAutoSession: (session: Omit<AssistentAutoSession, 'id'> & { id?: string }) => void
  clearAutoSession: () => void
  /** Letzter Übernehmen-Entwurf aus bw-apply */
  pendingDraft: KiAssistDraft | null
  setPendingDraft: (d: KiAssistDraft | null) => void
  /** Editor holt Entwurf ab (einmalig) */
  consumePendingDraft: (expected?: KiAssistDraft['type'] | KiAssistDraft['type'][]) => KiAssistDraft | null
}

const AssistentContext = createContext<AssistentContextValue | null>(null)

export function AssistentProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [scoped, setScoped] = useState<AssistentScopedSession | null>(null)
  const [autoSession, setAutoSession] = useState<AssistentAutoSession | null>(null)
  const [pendingDraft, setPendingDraft] = useState<KiAssistDraft | null>(null)
  const pathname = usePathname() ?? '/'

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const openScoped = useCallback((session: AssistentScopedSession) => {
    getKiAssistScope(session.scopeId)
    setAutoSession(null)
    setScoped(session)
    setPendingDraft(null)
    setOpen(true)
  }, [])

  const clearScoped = useCallback(() => setScoped(null), [])

  const openAutoSession = useCallback(
    (session: Omit<AssistentAutoSession, 'id'> & { id?: string }) => {
      setScoped(null)
      setPendingDraft(null)
      setAutoSession({
        ...session,
        id: session.id ?? `auto-${Date.now()}`,
      })
      setOpen(true)
    },
    []
  )

  const clearAutoSession = useCallback(() => setAutoSession(null), [])

  const consumePendingDraft = useCallback(
    (expected?: KiAssistDraft['type'] | KiAssistDraft['type'][]) => {
      const d = pendingDraft
      if (!d) return null
      if (expected) {
        const allow = Array.isArray(expected) ? expected : [expected]
        if (!allow.includes(d.type)) return null
      }
      setPendingDraft(null)
      return d
    },
    [pendingDraft]
  )

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      pathname,
      scoped,
      openScoped,
      clearScoped,
      autoSession,
      openAutoSession,
      clearAutoSession,
      pendingDraft,
      setPendingDraft,
      consumePendingDraft,
    }),
    [
      open,
      toggle,
      pathname,
      scoped,
      openScoped,
      clearScoped,
      autoSession,
      openAutoSession,
      clearAutoSession,
      pendingDraft,
      consumePendingDraft,
    ]
  )

  return <AssistentContext.Provider value={value}>{children}</AssistentContext.Provider>
}

export function useAssistent() {
  const ctx = useContext(AssistentContext)
  if (!ctx) throw new Error('useAssistent außerhalb AssistentProvider')
  return ctx
}

/** Für Surfaces außerhalb des Providers (kein Throw). */
export function useAssistentOptional() {
  return useContext(AssistentContext)
}

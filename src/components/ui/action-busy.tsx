'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition as useReactTransition,
  type ReactNode,
  type TransitionStartFunction,
} from 'react'
import { createPortal } from 'react-dom'

type BusyState = { depth: number; label: string }

type BusyApi = {
  show: (label?: string) => void
  hide: () => void
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>
}

const DEFAULT_LABEL = 'Wird geladen…'

let state: BusyState = { depth: 0, label: DEFAULT_LABEL }
const listeners = new Set<(s: BusyState) => void>()

function emit() {
  for (const l of Array.from(listeners)) l(state)
}

function showBusy(label?: string) {
  const nextLabel = (label ?? '').trim()
  state = {
    depth: state.depth + 1,
    label: nextLabel || (state.depth > 0 ? state.label : DEFAULT_LABEL),
  }
  if (!state.label) state = { ...state, label: DEFAULT_LABEL }
  emit()
}

function hideBusy() {
  const nextDepth = Math.max(0, state.depth - 1)
  state = {
    depth: nextDepth,
    label: nextDepth === 0 ? DEFAULT_LABEL : state.label,
  }
  emit()
}

async function runBusy<T>(label: string, fn: () => Promise<T>): Promise<T> {
  showBusy(label)
  try {
    return await fn()
  } finally {
    hideBusy()
  }
}

/** Imperativ — Speichern, Löschen, Navigation, Server Actions. */
export const actionBusy: BusyApi = {
  show: showBusy,
  hide: hideBusy,
  run: runBusy,
}

const ActionBusyContext = createContext<BusyApi>(actionBusy)

export function useActionBusy(): BusyApi {
  return useContext(ActionBusyContext)
}

/**
 * Drop-in für React `useTransition`: globales Loading, solange die Transition läuft
 * (typisch Server Actions / Supabase).
 */
export function useBusyTransition(
  label = DEFAULT_LABEL
): [boolean, TransitionStartFunction] {
  const [pending, startTransition] = useReactTransition()

  useEffect(() => {
    if (!pending) return
    actionBusy.show(label)
    return () => actionBusy.hide()
  }, [pending, label])

  return [pending, startTransition]
}

/** Alias — `import { useTransition } from '@/components/ui/action-busy'` */
export const useTransition = useBusyTransition

export function ActionBusyProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<BusyState>(state)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    listeners.add(setSnap)
    setSnap({ ...state })
    return () => {
      listeners.delete(setSnap)
    }
  }, [])

  const open = snap.depth > 0

  return (
    <ActionBusyContext.Provider value={actionBusy}>
      {children}
      {mounted && open
        ? createPortal(
            <div className="action-busy" role="status" aria-live="polite" aria-busy="true">
              <div className="action-busy__card">
                <span className="action-busy__spinner" aria-hidden />
                <span className="action-busy__label">{snap.label}</span>
              </div>
            </div>,
            document.body
          )
        : null}
    </ActionBusyContext.Provider>
  )
}

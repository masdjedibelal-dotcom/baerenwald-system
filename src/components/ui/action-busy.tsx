'use client'

import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition as useReactTransition,
  type ReactNode,
  type TransitionStartFunction,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'

type BusyState = { depth: number; label: string }

type BusyApi = {
  show: (label?: string) => void
  hide: () => void
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>
}

const DEFAULT_LABEL = 'Wird geladen…'

let state: BusyState = { depth: 0, label: DEFAULT_LABEL }
const listeners = new Set<(s: BusyState) => void>()

/** Route-Navigation: einmal show, hide bei Path-/Query-Wechsel oder Timeout. */
let routeBusyDepth = 0
let routeBusyTimer: ReturnType<typeof setTimeout> | null = null

/** Overlay nach Neu-Popover: hide wenn Sheet/Wizard da ist. */
let overlayBusyActive = false

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

/**
 * Loading bis die Ziel-URL (Pfad oder Query) wechselt — verhindert Flash der alten Seite
 * (z. B. Vorgänge) nach Schließen eines Pickers vor `router.push`.
 */
export function showRouteBusy(label: string, safetyMs = 12000) {
  if (routeBusyDepth === 0) {
    showBusy(label)
    routeBusyDepth = 1
  } else {
    state = { ...state, label: label.trim() || state.label || DEFAULT_LABEL }
    emit()
  }
  if (routeBusyTimer) clearTimeout(routeBusyTimer)
  routeBusyTimer = setTimeout(() => {
    hideRouteBusy()
  }, safetyMs)
}

export function hideRouteBusy() {
  if (routeBusyTimer) {
    clearTimeout(routeBusyTimer)
    routeBusyTimer = null
  }
  if (routeBusyDepth <= 0) return
  routeBusyDepth = 0
  hideBusy()
}

/** Kurz zwischen Neu-Menü und Overlay — getrennt von Route-Busy. */
export function showOverlayBusy(label: string) {
  if (overlayBusyActive) {
    state = { ...state, label: label.trim() || state.label || DEFAULT_LABEL }
    emit()
    return
  }
  overlayBusyActive = true
  showBusy(label)
}

export function hideOverlayBusy() {
  if (!overlayBusyActive) return
  overlayBusyActive = false
  hideBusy()
}

function RouteBusyPathListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname ?? ''}?${searchParams?.toString() ?? ''}`
  const prevRouteKey = useRef(routeKey)

  useEffect(() => {
    if (prevRouteKey.current === routeKey) return
    prevRouteKey.current = routeKey
    if (routeBusyDepth > 0) hideRouteBusy()
  }, [routeKey])

  return null
}

const ActionBusyContext = createContext<BusyApi>(actionBusy)

export function useActionBusy(): BusyApi {
  return useContext(ActionBusyContext)
}

export type UseBusyTransitionOptions = {
  /**
   * true (Default): Vollbild-Overlay (`action-busy`).
   * false: nur `pending` — wenn lokal schon Busy da ist (Button `loading`, DocumentCanvas, …).
   */
  global?: boolean
}

/**
 * Drop-in für React `useTransition`.
 * Regel: lokaler Busy gewinnt → `global: false` / `useLocalTransition`.
 * Ohne lokalen Busy → Default (`global: true`).
 */
export function useBusyTransition(
  label = DEFAULT_LABEL,
  options?: UseBusyTransitionOptions
): [boolean, TransitionStartFunction] {
  const [pending, startTransition] = useReactTransition()
  const showGlobal = options?.global !== false

  useEffect(() => {
    if (!showGlobal || !pending) return
    actionBusy.show(label)
    return () => actionBusy.hide()
  }, [pending, label, showGlobal])

  return [pending, startTransition]
}

/** Alias — `import { useTransition } from '@/components/ui/action-busy'` */
export const useTransition = useBusyTransition

/** Transition ohne Vollbild — lokaler Busy (Button/Canvas/Sheet) übernimmt. */
export function useLocalTransition(
  label = DEFAULT_LABEL
): [boolean, TransitionStartFunction] {
  return useBusyTransition(label, { global: false })
}

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
  useOverlayChromeLock(mounted && open)

  return (
    <ActionBusyContext.Provider value={actionBusy}>
      <Suspense fallback={null}>
        <RouteBusyPathListener />
      </Suspense>
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

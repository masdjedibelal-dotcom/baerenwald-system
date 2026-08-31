'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { actionBusy } from '@/components/ui/action-busy'

export type ConfirmActionOptions = {
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Destruktiv (löschen / abmelden / zurücknehmen) */
  danger?: boolean
  /** Busy-Label während onConfirm; leer = kein Overlay */
  busyLabel?: string | null
  onConfirm: () => void | Promise<void>
}

type ConfirmActionContextValue = {
  confirmAction: (opts: ConfirmActionOptions) => void
}

const ConfirmActionContext = createContext<ConfirmActionContextValue | null>(null)

let globalConfirmAction: ((opts: ConfirmActionOptions) => void) | null = null

/**
 * Imperative CRM-Bestätigung (ConfirmPopup) — Ersatz für `window.confirm`.
 * Funktioniert nur unter ConfirmActionProvider (Dashboard).
 */
export function confirmAction(opts: ConfirmActionOptions) {
  if (globalConfirmAction) {
    globalConfirmAction(opts)
    return
  }
  // Provider fehlt (z. B. Story/Test) — Aktion nicht still ausführen
  console.warn('[confirmAction] ConfirmActionProvider fehlt — Abbruch')
}

export function useConfirmAction() {
  const ctx = useContext(ConfirmActionContext)
  if (!ctx) throw new Error('useConfirmAction requires ConfirmActionProvider')
  return ctx
}

export function ConfirmActionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmActionOptions | null>(null)
  const [pending, setPending] = useState(false)

  const confirmActionFn = useCallback((opts: ConfirmActionOptions) => {
    setPending(false)
    setState({
      ...opts,
      title: opts.title.trim(),
      confirmLabel: opts.confirmLabel?.trim() || 'Bestätigen',
      cancelLabel: opts.cancelLabel?.trim() || 'Abbrechen',
    })
  }, [])

  globalConfirmAction = confirmActionFn

  async function handleConfirm() {
    if (!state || pending) return
    const run = state.onConfirm
    const busy = state.busyLabel
    setPending(true)
    setState(null)
    try {
      if (busy === null) {
        await Promise.resolve(run())
      } else if (busy) {
        await actionBusy.run(busy, async () => {
          await Promise.resolve(run())
        })
      } else {
        await Promise.resolve(run())
      }
    } catch {
      // Toast vom Aufrufer
    } finally {
      setPending(false)
    }
  }

  return (
    <ConfirmActionContext.Provider value={{ confirmAction: confirmActionFn }}>
      {children}
      <ConfirmPopup
        open={Boolean(state)}
        onClose={() => {
          if (!pending) setState(null)
        }}
        title={state?.title ?? ''}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        danger={state?.danger}
        onConfirm={() => {
          void handleConfirm()
        }}
      >
        {state?.body ? (
          typeof state.body === 'string' ? (
            <p>{state.body}</p>
          ) : (
            state.body
          )
        ) : null}
      </ConfirmPopup>
    </ConfirmActionContext.Provider>
  )
}

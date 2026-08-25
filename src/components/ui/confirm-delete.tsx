'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { actionBusy } from '@/components/ui/action-busy'

type ConfirmState = {
  /** Verb + Objekt, z. B. „Vorgang löschen?“ */
  title: string
  sub?: string
  body?: string
  onConfirm: () => void | Promise<void>
}

type ConfirmDeleteContextValue = {
  confirmDelete: (
    title: string,
    onConfirm: () => void | Promise<void>,
    opts?: { sub?: string; body?: string }
  ) => void
}

const ConfirmDeleteContext = createContext<ConfirmDeleteContextValue | null>(null)

let globalConfirmDelete:
  | ((
      title: string,
      onConfirm: () => void | Promise<void>,
      opts?: { sub?: string; body?: string }
    ) => void)
  | null = null

/** Wie Bulk-Löschen: MockModal Verb+Objekt — für Swipe / entityMenu. */
export function confirmDelete(
  title: string,
  onConfirm: () => void | Promise<void>,
  opts?: { sub?: string; body?: string }
) {
  if (globalConfirmDelete) {
    globalConfirmDelete(title, onConfirm, opts)
    return
  }
  void Promise.resolve(onConfirm())
}

export function useConfirmDelete() {
  const ctx = useContext(ConfirmDeleteContext)
  if (!ctx) throw new Error('useConfirmDelete requires ConfirmDeleteProvider')
  return ctx
}

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const [pending, setPending] = useState(false)

  const confirmDeleteFn = useCallback(
    (
      title: string,
      onConfirm: () => void | Promise<void>,
      opts?: { sub?: string; body?: string }
    ) => {
      setPending(false)
      const t = title.trim()
      setState({
        title: t.endsWith('?') ? t : `${t}?`,
        sub: opts?.sub,
        body: opts?.body,
        onConfirm,
      })
    },
    []
  )

  globalConfirmDelete = confirmDeleteFn

  async function handleConfirm() {
    if (!state || pending) return
    setPending(true)
    actionBusy.show('Wird gelöscht…')
    try {
      await Promise.resolve(state.onConfirm())
      setState(null)
    } catch {
      // Fehler-Toast kommt vom Aufrufer — Modal bleibt zum erneuten Versuch
    } finally {
      actionBusy.hide()
      setPending(false)
    }
  }

  return (
    <ConfirmDeleteContext.Provider value={{ confirmDelete: confirmDeleteFn }}>
      {children}
      {state ? (
        <MockModal
          open
          icon="trash"
          title={state.title}
          sub={state.sub ?? 'Dauerhaft entfernen.'}
          size="sm"
          onClose={() => {
            if (!pending) setState(null)
          }}
          footer={
            <>
              <MockBtn kind="ghost" disabled={pending} onClick={() => setState(null)}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn
                kind="danger"
                icon={pending ? undefined : 'trash'}
                disabled={pending}
                onClick={() => void handleConfirm()}
              >
                {pending ? 'Wird gelöscht…' : 'Löschen'}
              </MockBtn>
            </>
          }
        >
          <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
            {pending
              ? 'Bitte warten…'
              : state.body ??
                'Der Eintrag wird unwiderruflich gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.'}
          </div>
        </MockModal>
      ) : null}
    </ConfirmDeleteContext.Provider>
  )
}

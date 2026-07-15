'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'

type ConfirmState = {
  label: string
  onConfirm: () => void
}

type ConfirmDeleteContextValue = {
  confirmDelete: (label: string, onConfirm: () => void) => void
}

const ConfirmDeleteContext = createContext<ConfirmDeleteContextValue | null>(null)

let globalConfirmDelete: ((label: string, onConfirm: () => void) => void) | null = null

/** Wie Mock `window.__confirmDelete` — für entityMenu-Löschaktionen */
export function confirmDelete(label: string, onConfirm: () => void) {
  if (globalConfirmDelete) {
    globalConfirmDelete(label, onConfirm)
    return
  }
  onConfirm()
}

export function useConfirmDelete() {
  const ctx = useContext(ConfirmDeleteContext)
  if (!ctx) throw new Error('useConfirmDelete requires ConfirmDeleteProvider')
  return ctx
}

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirmDeleteFn = useCallback((label: string, onConfirm: () => void) => {
    setState({ label, onConfirm })
  }, [])

  globalConfirmDelete = confirmDeleteFn

  return (
    <ConfirmDeleteContext.Provider value={{ confirmDelete: confirmDeleteFn }}>
      {children}
      {state ? (
        <MockModal
          open
          icon="trash"
          title="Wirklich löschen?"
          sub={state.label}
          onClose={() => setState(null)}
          footer={
            <>
              <MockBtn kind="ghost" onClick={() => setState(null)}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn
                kind="danger"
                icon="trash"
                onClick={() => {
                  const fn = state.onConfirm
                  setState(null)
                  fn()
                }}
              >
                Löschen
              </MockBtn>
            </>
          }
        >
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {state.label} wird dauerhaft entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
          </div>
        </MockModal>
      ) : null}
    </ConfirmDeleteContext.Provider>
  )
}

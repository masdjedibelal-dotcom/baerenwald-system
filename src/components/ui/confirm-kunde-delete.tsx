'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { actionBusy } from '@/components/ui/action-busy'
import {
  deleteKunde,
  getKundeDeletePreview,
  type KundeDeletePreview,
} from '@/app/actions/kunden'
import { toast } from '@/components/ui/app-toast'

type ConfirmState = {
  kundeId: string
  onDone?: () => void | Promise<void>
}

type ConfirmKundeDeleteContextValue = {
  confirmKundeDelete: (kundeId: string, onDone?: () => void | Promise<void>) => void
}

const ConfirmKundeDeleteContext = createContext<ConfirmKundeDeleteContextValue | null>(null)

let globalConfirmKundeDelete:
  | ((kundeId: string, onDone?: () => void | Promise<void>) => void)
  | null = null

/** Globaler Einstieg (Listen/Swipe/Detail-Menü) — MockModal mit Umfang + Namens-Confirm. */
export function confirmKundeDelete(kundeId: string, onDone?: () => void | Promise<void>) {
  if (globalConfirmKundeDelete) {
    globalConfirmKundeDelete(kundeId, onDone)
    return
  }
  toast.error('Lösch-Dialog nicht verfügbar.')
}

export function useConfirmKundeDelete() {
  const ctx = useContext(ConfirmKundeDeleteContext)
  if (!ctx) throw new Error('useConfirmKundeDelete requires ConfirmKundeDeleteProvider')
  return ctx
}

export function ConfirmKundeDeleteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const [preview, setPreview] = useState<KundeDeletePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const confirmKundeDeleteFn = useCallback(
    (kundeId: string, onDone?: () => void | Promise<void>) => {
      setPreview(null)
      setLoadError(null)
      setNameInput('')
      setPending(false)
      setState({ kundeId: kundeId.trim(), onDone })
    },
    []
  )

  globalConfirmKundeDelete = confirmKundeDeleteFn

  useEffect(() => {
    if (!state?.kundeId) return
    let cancelled = false
    setLoading(true)
    void getKundeDeletePreview(state.kundeId).then((r) => {
      if (cancelled) return
      setLoading(false)
      if (!r.ok) {
        setLoadError(r.message)
        return
      }
      setPreview(r.preview)
    })
    return () => {
      cancelled = true
    }
  }, [state?.kundeId])

  const nameOk =
    Boolean(preview) &&
    !preview!.blocked &&
    nameInput.trim() === preview!.kundeName.trim()

  async function handleConfirm() {
    if (!state || !preview || preview.blocked || !nameOk || pending) return
    setPending(true)
    actionBusy.show('Kunde wird gelöscht…')
    try {
      const r = await deleteKunde(state.kundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Kunde gelöscht')
      const done = state.onDone
      setState(null)
      if (done) await Promise.resolve(done())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Löschen fehlgeschlagen')
    } finally {
      actionBusy.hide()
      setPending(false)
    }
  }

  function close() {
    if (pending) return
    setState(null)
  }

  return (
    <ConfirmKundeDeleteContext.Provider value={{ confirmKundeDelete: confirmKundeDeleteFn }}>
      {children}
      {state ? (
        <MockModal
          open
          icon="trash"
          title="Kunde löschen?"
          sub={
            preview?.blocked
              ? 'Löschen blockiert'
              : 'Dauerhaft entfernen — inkl. Vorgänge und Rechnungen.'
          }
          size="sm"
          onClose={close}
          footer={
            <>
              <MockBtn kind="ghost" disabled={pending} onClick={close}>
                Abbrechen
              </MockBtn>
              <div style={{ flex: 1 }} />
              <MockBtn
                kind="danger"
                icon={pending ? undefined : 'trash'}
                disabled={pending || loading || !preview || preview.blocked || !nameOk}
                title={
                  preview?.blocked
                    ? preview.blockReason ?? undefined
                    : !nameOk && preview
                      ? 'Bitte Kundennamen zur Bestätigung eintippen'
                      : undefined
                }
                onClick={() => void handleConfirm()}
              >
                {pending ? 'Wird gelöscht…' : 'Kunde löschen'}
              </MockBtn>
            </>
          }
        >
          <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.55 }}>
            {loading ? (
              <p className="m-0">Umfang wird geladen…</p>
            ) : loadError ? (
              <p className="m-0" style={{ color: 'var(--danger, #b42318)' }}>
                {loadError}
              </p>
            ) : preview?.blocked ? (
              <p className="m-0" role="status">
                {preview.blockReason}
              </p>
            ) : preview ? (
              <>
                <p className="m-0 mb-3">
                  Es werden mitgelöscht:
                </p>
                <ul className="m-0 mb-3 pl-5" style={{ listStyle: 'disc' }}>
                  <li>
                    <b>{preview.vorgaenge}</b> Vorgang{preview.vorgaenge === 1 ? '' : 'e'}
                  </li>
                  <li>
                    <b>{preview.angebote}</b> Angebot{preview.angebote === 1 ? '' : 'e'}
                  </li>
                  <li>
                    <b>{preview.auftraege}</b> Auftrag{preview.auftraege === 1 ? '' : 'e'}
                  </li>
                  <li>
                    <b>{preview.rechnungen}</b> Rechnung{preview.rechnungen === 1 ? '' : 'en'}
                  </li>
                </ul>
                {preview.hasMieterStatusToken ? (
                  <p
                    className="m-0 mb-3"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--warn-soft, #fff7ed)',
                      color: 'var(--text)',
                      fontSize: 'var(--fs-meta)',
                    }}
                  >
                    Ein Mieter-Status-Link wird ungültig.
                  </p>
                ) : null}
                <div className="field" style={{ marginTop: 4 }}>
                  <div className="field-label">
                    Zur Bestätigung „{preview.kundeName}“ eintippen
                  </div>
                  <input
                    className="txt"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={preview.kundeName}
                    autoComplete="off"
                    disabled={pending}
                    aria-label="Kundenname zur Bestätigung"
                  />
                </div>
              </>
            ) : null}
          </div>
        </MockModal>
      ) : null}
    </ConfirmKundeDeleteContext.Provider>
  )
}

'use client'

import { MockInput } from '@/components/mock-ui/MockForm'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { actionBusy } from '@/components/ui/action-busy'
import {
  deleteKunde,
  getKundeDeletePreview,
  type KundeDeletePreview,
} from '@/app/actions/kunden'
import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'

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

/** Globaler Einstieg (Listen/Swipe/Detail-Menü) — ConfirmPopup mit Umfang + Namens-Confirm. */
export function confirmKundeDelete(kundeId: string, onDone?: () => void | Promise<void>) {
  if (globalConfirmKundeDelete) {
    globalConfirmKundeDelete(kundeId, onDone)
    return
  }
  toast.error(TOAST.loesch_dialog_nicht_verfuegbar)
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
        toast.systemError(r)
        return
      }
      toast.success(TOAST.kunde_geloescht)
      const done = state.onDone
      setState(null)
      if (done) await Promise.resolve(done())
    } catch (e) {
      toast.systemError(e, 'ui', 'Löschen fehlgeschlagen')
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
        <ConfirmPopup
          open
          title="Kunde löschen?"
          danger
          busy={pending}
          confirmDisabled={pending || loading || !preview || preview.blocked || !nameOk}
          confirmLabel={pending ? 'Wird gelöscht…' : 'Kunde löschen'}
          onClose={close}
          onConfirm={() => void handleConfirm()}
        >
          <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.55 }}>
            <p className="m-0 mb-2" style={{ color: 'var(--text-3)' }}>
              {preview?.blocked
                ? 'Löschen blockiert'
                : 'Dauerhaft entfernen — inkl. Vorgänge und Rechnungen.'}
            </p>
            {loading ? (
              <p className="m-0">Umfang wird geladen…</p>
            ) : loadError ? (
              <p className="m-0" style={{ color: 'var(--danger)' }}>
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
                      padding: '0.5rem 0.6250remrem',
                      borderRadius: 8,
                      background: 'var(--warn-soft)',
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
                  <MockInput className="txt" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={preview.kundeName} autoComplete="off" disabled={pending} aria-label="Kundenname zur Bestätigung" />
                </div>
              </>
            ) : null}
          </div>
        </ConfirmPopup>
      ) : null}
    </ConfirmKundeDeleteContext.Provider>
  )
}

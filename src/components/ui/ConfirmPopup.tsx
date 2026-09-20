'use client'

import { MockBtn } from '@/components/mock-ui'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'
import { actionBusy } from '@/components/ui/action-busy'

/**
 * Zentriertes Bestätigungs-Popup (Mobil + Desktop) —
 * für kurze Hinweise wie „Änderungen verwerfen?“, nicht für Formulare.
 *
 * Optional `onSaveDraft`: Drei Wege (Entwurf speichern / ohne Speichern / weiter).
 */
export function ConfirmPopup({
  open,
  onClose,
  title,
  children,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  danger = false,
  saveDraftLabel = 'Als Entwurf speichern',
  onSaveDraft,
  discardLabel,
  busy = false,
  confirmDisabled = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  danger?: boolean
  /** Wenn gesetzt: dritter Weg „Als Entwurf speichern“ (gestapelter Footer). */
  saveDraftLabel?: string
  onSaveDraft?: () => void
  /** Label für den Verwerfen-/Schließen-Button (Default = confirmLabel). */
  discardLabel?: string
  /** Speichern läuft — Buttons sperren, Dialog bleibt deckend sichtbar. */
  busy?: boolean
  /** Confirm-Button sperren (z. B. Namens-Confirm noch falsch). */
  confirmDisabled?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setMounted(true), [])
  useOverlayChromeLock(open && mounted)

  useEffect(() => {
    if (!open || !mounted) return
    const dialog = dialogRef.current
    if (!dialog) return
    return trapFocus(dialog, () => {
      if (!busy) onCloseRef.current()
    })
  }, [open, mounted, busy])

  if (!open || !mounted) return null

  const leaveLabel = discardLabel ?? confirmLabel
  const unsavedClose = Boolean(onSaveDraft)
  const confirmBlocked = busy || confirmDisabled

  return createPortal(
    <div
      className="confirm-popup-overlay"
      role="presentation"
      onClick={(e) => {
        if (busy) return
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="confirm-popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        <div className="confirm-popup__body">
          <h2 id={titleId} className="confirm-popup__title">
            {title}
          </h2>
          {children ? <div className="confirm-popup__text">{children}</div> : null}
        </div>
        <div
          className={cn(
            'confirm-popup__footer',
            unsavedClose && 'confirm-popup__footer--stack',
            danger && 'confirm-popup__footer--danger'
          )}
        >
          {unsavedClose ? (
            <>
              <MockBtn
                type="button"
                kind="primary"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onSaveDraft?.()
                }}
              >
                {saveDraftLabel}
              </MockBtn>
              <MockBtn
                type="button"
                kind="danger"
<<<<<<< Updated upstream
                disabled={confirmBlocked}
=======
                disabled={busy}
>>>>>>> Stashed changes
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmBlocked) return
                  onConfirm()
                }}
              >
                {leaveLabel}
              </MockBtn>
              <MockBtn
                type="button"
                kind="secondary"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </MockBtn>
            </>
          ) : danger ? (
            <>
              <MockBtn
                type="button"
                kind="danger"
<<<<<<< Updated upstream
                disabled={confirmBlocked}
=======
                disabled={busy}
>>>>>>> Stashed changes
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmBlocked) return
                  onConfirm()
                }}
              >
                {confirmLabel}
              </MockBtn>
              <MockBtn
                type="button"
                kind="primary"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </MockBtn>
            </>
          ) : (
            <>
              <MockBtn
                type="button"
                kind="secondary"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {cancelLabel}
              </MockBtn>
              <MockBtn
                type="button"
                kind="primary"
<<<<<<< Updated upstream
                disabled={confirmBlocked}
=======
                disabled={busy}
>>>>>>> Stashed changes
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirmBlocked) return
                  onConfirm()
                }}
              >
                {confirmLabel}
              </MockBtn>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Imperative Anfrage an ConfirmPopupHost (E1). */
export type OpenConfirmPopupOpts = {
  title: string
  body?: ReactNode
  sub?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Busy-Label; bei delete-Default „Wird gelöscht…“; null = kein Overlay */
  busyLabel?: string | null
  /** Lösch-Defaults (Titel-?, Body, danger, Labels) */
  variant?: 'delete' | 'action'
  onConfirm: () => void | Promise<void>
}

type HostState = OpenConfirmPopupOpts & { title: string }

let globalOpenConfirmPopup: ((opts: OpenConfirmPopupOpts) => void) | null = null

/** Öffnet ConfirmPopup über ConfirmPopupHost (E1, imperative Bestätigung). */
export function openConfirmPopup(opts: OpenConfirmPopupOpts) {
  if (globalOpenConfirmPopup) {
    globalOpenConfirmPopup(opts)
    return
  }
  console.warn('[openConfirmPopup] ConfirmPopupHost fehlt — Abbruch')
}

const DELETE_DEFAULT_BODY =
  'Der Eintrag wird unwiderruflich gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.'

/** Lösch-Bestätigung (E1) — Titel, Callback, optionale Texte/Labels. */
export function openDeleteConfirm(
  title: string,
  onConfirm: () => void | Promise<void>,
  opts?: {
    sub?: string
    body?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    busyLabel?: string | null
  }
) {
  openConfirmPopup({
    variant: 'delete',
    title,
    onConfirm,
    sub: opts?.sub,
    body: opts?.body,
    confirmLabel: opts?.confirmLabel,
    cancelLabel: opts?.cancelLabel,
    busyLabel: opts?.busyLabel,
    danger: true,
  })
}

/** Aktions-Bestätigung (E1) — Objekt mit title/onConfirm und optionalen Labels. */
export function openActionConfirm(opts: {
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busyLabel?: string | null
  onConfirm: () => void | Promise<void>
}) {
  openConfirmPopup({
    variant: 'action',
    title: opts.title,
    body: opts.body,
    confirmLabel: opts.confirmLabel,
    cancelLabel: opts.cancelLabel,
    danger: opts.danger,
    busyLabel: opts.busyLabel,
    onConfirm: opts.onConfirm,
  })
}

/** Dashboard-Host: ein ConfirmPopup für alle imperativen Bestätigungen. */
export function ConfirmPopupHost({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HostState | null>(null)
  const [pending, setPending] = useState(false)

  const openFn = useCallback((opts: OpenConfirmPopupOpts) => {
    setPending(false)
    const variant = opts.variant ?? (opts.danger ? 'delete' : 'action')
    let title = opts.title.trim()
    if (variant === 'delete' && !title.endsWith('?')) title = `${title}?`
    setState({
      ...opts,
      title,
      variant,
      confirmLabel:
        opts.confirmLabel?.trim() ||
        (variant === 'delete' ? 'Löschen' : 'Bestätigen'),
      cancelLabel: opts.cancelLabel?.trim() || 'Abbrechen',
      danger: opts.danger ?? variant === 'delete',
    })
  }, [])

  globalOpenConfirmPopup = openFn

  async function handleConfirm() {
    if (!state || pending) return
    const run = state.onConfirm
    const variant = state.variant ?? 'action'
    const busy =
      state.busyLabel === null
        ? null
        : state.busyLabel !== undefined
          ? state.busyLabel
          : variant === 'delete'
            ? 'Wird gelöscht…'
            : undefined
    setPending(true)
    try {
      if (busy === null) {
        await Promise.resolve(run())
      } else if (busy) {
        await actionBusy.run(busy, async () => {
          await Promise.resolve(run())
        })
      } else if (variant === 'delete') {
        actionBusy.show('Wird gelöscht…')
        try {
          await Promise.resolve(run())
        } finally {
          actionBusy.hide()
        }
      } else {
        await Promise.resolve(run())
      }
      setState(null)
    } catch {
      // Toast vom Aufrufer — Dialog bleibt offen
    } finally {
      setPending(false)
    }
  }

  const variant = state?.variant ?? 'action'
  const pendingLabel =
    variant === 'delete' ? 'Wird gelöscht…' : 'Wird gespeichert…'

  return (
    <>
      {children}
      <ConfirmPopup
        open={Boolean(state)}
        onClose={() => {
          if (!pending) setState(null)
        }}
        title={state?.title ?? ''}
        confirmLabel={pending ? pendingLabel : state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        danger={state?.danger}
        busy={pending}
        onConfirm={() => {
          void handleConfirm()
        }}
      >
        {state ? (
          variant === 'delete' ? (
            <>
              {state.sub ? <p>{state.sub}</p> : <p>Dauerhaft entfernen.</p>}
              <p>{pending ? 'Bitte warten…' : state.body ?? DELETE_DEFAULT_BODY}</p>
            </>
          ) : state.body ? (
            typeof state.body === 'string' ? (
              <p>{state.body}</p>
            ) : (
              state.body
            )
          ) : null
        ) : null}
      </ConfirmPopup>
    </>
  )
}

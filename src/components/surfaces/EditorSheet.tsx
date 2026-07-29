'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { ActionSheet } from '@/components/ui/ActionSheet'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSheetSwipeDismiss } from '@/hooks/useSheetSwipeDismiss'
import { trapFocus } from '@/lib/a11y/focus-trap'
import {
  pushEditorSheetHistory,
  releaseEditorSheetHistory,
  restoreEditorSheetHistoryAfterDirtyPop,
  updateEditorSheetHistoryPop,
} from '@/lib/surfaces/editor-sheet-history'
import { cn } from '@/lib/utils'

export type EditorSheetContext = 'detail' | 'canvas'

type EditorSheetApi = { requestClose: () => void }

const EditorSheetApiContext = createContext<EditorSheetApi | null>(null)

/** Für Footer-Abbrechen: gleicher Dirty-Confirm wie X/Swipe/Backdrop. */
export function useEditorSheetRequestClose(): (() => void) | null {
  return useContext(EditorSheetApiContext)?.requestClose ?? null
}

export type EditorSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Optional Untertitel (z. B. Rechnungsnummer im RateDrawer) */
  subtitle?: string | null
  /** Breadcrumb über dem Titel (Mock: „Elektrik >“) */
  crumb?: string | null
  /** detail | canvas — Desktop immer Slide-over (Spec §6: keine Center-Modals) */
  context?: EditorSheetContext
  children: ReactNode
  /** Dirty → X/Swipe/Backdrop/Back öffnen Confirm (S8) */
  dirty?: boolean
  /** Compose: rechte Action = Text „Senden“ statt ✓ */
  compose?: boolean
  composeLabel?: string
  onConfirm?: () => void
  confirmDisabled?: boolean
  confirmBusy?: boolean
  /** Optional statt ✓ / Senden (z. B. nur +) */
  headerEnd?: ReactNode
  /** Zusätzlicher Versuch zu schließen (Swipe etc.) */
  onDismissAttempt?: () => void
  className?: string
  bodyClassName?: string
  overlayClassName?: string
  size?: 'md' | 'lg'
  /** Sticky Footer-CTAs (LeistungDrawer / RateDrawer) — Aktionen nur hier */
  footer?: ReactNode
}

/**
 * Surface B — Create/Edit Entity.
 * Mobile: Bottom Sheet · Desktop: Slide-over 560px (auch aus Canvas-Kontext — Spec §6).
 */
export function EditorSheet({
  open,
  onClose,
  title,
  subtitle,
  crumb,
  context: _context = 'detail',
  children,
  dirty = false,
  compose = false,
  composeLabel = 'Senden',
  onConfirm,
  confirmDisabled,
  confirmBusy,
  headerEnd,
  onDismissAttempt,
  className,
  bodyClassName,
  overlayClassName,
  size = 'md',
  footer,
}: EditorSheetProps) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const sheetId = `editor-sheet:${titleId}`
  const historyPushed = useRef(false)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onDismissAttemptRef = useRef(onDismissAttempt)
  onDismissAttemptRef.current = onDismissAttempt

  const finishClose = useCallback(() => {
    setDiscardOpen(false)
    const stillPushed = historyPushed.current
    historyPushed.current = false
    releaseEditorSheetHistory(sheetId, { historyStillPushed: stillPushed })
    onCloseRef.current()
  }, [sheetId])

  const requestClose = useCallback(() => {
    onDismissAttemptRef.current?.()
    if (dirtyRef.current) {
      setDiscardOpen(true)
      return
    }
    finishClose()
  }, [finishClose])

  const handleHistoryPop = useCallback(() => {
    onDismissAttemptRef.current?.()
    if (dirtyRef.current) {
      setDiscardOpen(true)
      restoreEditorSheetHistoryAfterDirtyPop(sheetId)
      return
    }
    historyPushed.current = false
    releaseEditorSheetHistory(sheetId, { historyStillPushed: false })
    onCloseRef.current()
  }, [sheetId])

  // Spec §6 / Phase 2: nie center — Desktop Slide, Mobil Bottom
  const layout: 'bottom' | 'slide' = isMobile ? 'bottom' : 'slide'

  const { dragZoneProps, sheetMotionStyle } = useSheetSwipeDismiss({
    onDismiss: requestClose,
    blocked: !open || layout !== 'bottom' || discardOpen,
  })

  const confirmClose = useCallback(() => {
    finishClose()
  }, [finishClose])

  useEffect(() => {
    setMounted(true)
  }, [])

  /* S10: History-Entry — Stack, damit Split-over → Split-over kein Fremd-Discard auslöst */
  useEffect(() => {
    if (!open || !mounted) return
    pushEditorSheetHistory(sheetId, handleHistoryPop)
    historyPushed.current = true
    return () => {
      if (historyPushed.current) {
        historyPushed.current = false
        releaseEditorSheetHistory(sheetId, { historyStillPushed: true })
      } else {
        releaseEditorSheetHistory(sheetId, { historyStillPushed: false })
      }
    }
  }, [open, mounted, sheetId, handleHistoryPop])

  useEffect(() => {
    if (!open) return
    updateEditorSheetHistoryPop(sheetId, handleHistoryPop)
  }, [open, sheetId, handleHistoryPop])

  /* Body scroll lock + focus trap */
  useEffect(() => {
    if (!open || !mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const el = rootRef.current
    const release = el ? trapFocus(el, () => requestClose()) : undefined
    return () => {
      document.body.style.overflow = prev
      release?.()
    }
  }, [open, mounted, requestClose])

  /* S7: visualViewport */
  useEffect(() => {
    if (!open || !isMobile) return
    const root = rootRef.current
    const vv = window.visualViewport
    if (!root || !vv) return
    const sync = () => {
      root.style.height = `${vv.height}px`
      root.style.top = `${vv.offsetTop}px`
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--keyboard-inset', `${kb}px`)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.height = ''
      root.style.top = ''
      root.style.removeProperty('--keyboard-inset')
    }
  }, [open, isMobile])

  if (!open || !mounted) return null

  const api: EditorSheetApi = { requestClose }

  const end =
    headerEnd ??
    (onConfirm ? (
      compose ? (
        <button
          type="button"
          className="editor-sheet__confirm-text"
          disabled={confirmDisabled || confirmBusy}
          onClick={onConfirm}
        >
          {confirmBusy ? '…' : composeLabel}
        </button>
      ) : (
        <button
          type="button"
          className="editor-sheet__confirm"
          disabled={confirmDisabled || confirmBusy}
          onClick={onConfirm}
          aria-label="Speichern"
          title="Speichern"
        >
          <Check className="h-5 w-5" aria-hidden />
        </button>
      )
    ) : null)

  const panel = (
    <div
      ref={rootRef}
      className={cn(
        'editor-sheet',
        `editor-sheet--${layout}`,
        size === 'lg' && 'editor-sheet--lg',
        /* Fallback falls CSS-Build margin/justify droppt: Panel rechts ankern */
        layout === 'slide' && 'absolute right-0 top-0 ml-auto',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={layout === 'bottom' ? sheetMotionStyle : undefined}
    >
      {layout === 'bottom' ? (
        <div className="editor-sheet__drag-handle" {...dragZoneProps} aria-hidden>
          <div className="editor-sheet__drag-handle-bar" />
        </div>
      ) : null}
      <header
        className="editor-sheet__header"
        {...(layout === 'bottom' ? dragZoneProps : {})}
      >
        <div className="editor-sheet__title-block">
          {crumb ? <span className="editor-sheet__crumb">{crumb}</span> : null}
          <h2 id={titleId} className="editor-sheet__title">
            {title}
          </h2>
          {subtitle ? <p className="editor-sheet__subtitle">{subtitle}</p> : null}
        </div>
        <div className="editor-sheet__header-end">{end}</div>
        <button
          type="button"
          className="editor-sheet__icon-btn"
          onClick={requestClose}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>
      <div className={cn('editor-sheet__body', bodyClassName)}>{children}</div>
      {footer ? (
        <EditorSheetApiContext.Provider value={api}>
          <div className="editor-sheet__footer">{footer}</div>
        </EditorSheetApiContext.Provider>
      ) : null}
    </div>
  )

  return createPortal(
    <EditorSheetApiContext.Provider value={api}>
      <div
        className={cn(
          'editor-sheet-overlay',
          `editor-sheet-overlay--${layout}`,
          layout === 'slide' && 'justify-end',
          overlayClassName
        )}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose()
        }}
      >
        {panel}
      </div>
      {isMobile ? (
        <ActionSheet
          open={discardOpen}
          onClose={() => setDiscardOpen(false)}
          title="Änderungen verwerfen?"
          items={[
            { label: 'Verwerfen', danger: true, onClick: confirmClose },
            { label: 'Weiter bearbeiten', onClick: () => setDiscardOpen(false) },
          ]}
        />
      ) : (
        <Modal
          open={discardOpen}
          onClose={() => setDiscardOpen(false)}
          title="Änderungen verwerfen?"
          size="sm"
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setDiscardOpen(false)}>
                Weiter bearbeiten
              </Button>
              <Button type="button" variant="danger" onClick={confirmClose}>
                Verwerfen
              </Button>
            </>
          }
        >
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">Ungespeicherte Eingaben gehen verloren.</p>
        </Modal>
      )}
    </EditorSheetApiContext.Provider>,
    document.body
  )
}

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
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { useAssistentOptional } from '@/components/assistent/AssistentProvider'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { useSheetSwipeDismiss } from '@/hooks/useSheetSwipeDismiss'
import { trapFocus } from '@/lib/a11y/focus-trap'
import {
  guardSheetPointerFallthrough,
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
  /**
   * Browser-History für Back-to-Close (default true).
   * Aus bei Pickern vor einer Navigation — sonst frisst history.back() die neue URL.
   */
  manageHistory?: boolean
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
  context = 'detail',
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
  manageHistory = true,
}: EditorSheetProps) {
  const isMobile = useIsMobile()
  const assistent = useAssistentOptional()
  const [fieldOverlayOpen, setFieldOverlayOpen] = useState(false)
  useEffect(() => {
    const on = (e: Event) => {
      const open = Boolean((e as CustomEvent<{ open?: boolean }>).detail?.open)
      setFieldOverlayOpen(open)
    }
    window.addEventListener('ki-field-overlay', on)
    return () => window.removeEventListener('ki-field-overlay', on)
  }, [])
  const [mounted, setMounted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const isRecessedOverlay =
    typeof overlayClassName === 'string' &&
    overlayClassName.includes('editor-sheet-overlay--recessed')
  const isStackedOverlay =
    typeof overlayClassName === 'string' &&
    overlayClassName.includes('editor-sheet-overlay--stack')

  const pauseFocusTrap = Boolean(
    discardOpen ||
      (assistent?.open && assistent.scoped?.layer === 'over-sheet') ||
      fieldOverlayOpen ||
      isRecessedOverlay
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const sheetId = `editor-sheet:${titleId}`
  const historyPushed = useRef(false)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onDismissAttemptRef = useRef(onDismissAttempt)
  onDismissAttemptRef.current = onDismissAttempt
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  const finishClose = useCallback(() => {
    setDiscardOpen(false)
    const stillPushed = historyPushed.current
    historyPushed.current = false
    if (manageHistory) {
      releaseEditorSheetHistory(sheetId, { historyStillPushed: stillPushed })
    }
    onCloseRef.current()
    /* Nach Parent-Close — sonst schluckt der Guard ggf. noch den Verwerfen-Klick */
    window.setTimeout(() => guardSheetPointerFallthrough(), 0)
  }, [sheetId, manageHistory])

  const requestClose = useCallback(() => {
    onDismissAttemptRef.current?.()
    if (dirtyRef.current) {
      setDiscardOpen(true)
      return
    }
    finishClose()
  }, [finishClose])
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  const handleHistoryPop = useCallback(() => {
    onDismissAttemptRef.current?.()
    if (dirtyRef.current) {
      setDiscardOpen(true)
      restoreEditorSheetHistoryAfterDirtyPop(sheetId)
      return
    }
    historyPushed.current = false
    if (manageHistory) {
      releaseEditorSheetHistory(sheetId, { historyStillPushed: false })
    }
    onCloseRef.current()
    window.setTimeout(() => guardSheetPointerFallthrough(), 0)
  }, [sheetId, manageHistory])

  /* Sheet geschlossen → Confirm-State zurücksetzen */
  useEffect(() => {
    if (!open) setDiscardOpen(false)
  }, [open])

  const handleConfirm = useCallback(() => {
    guardSheetPointerFallthrough()
    onConfirmRef.current?.()
  }, [])

  // Spec §6 / Phase 2: nie center — Desktop Slide, Mobil Bottom
  const layout: 'bottom' | 'slide' = isMobile ? 'bottom' : 'slide'

  const { dragZoneProps, sheetMotionStyle } = useSheetSwipeDismiss({
    onDismiss: requestClose,
    /* Recessed = Kind-Sheet offen — kein Swipe/Transform am Parent (sonst hängt translateY) */
    blocked: !open || layout !== 'bottom' || discardOpen || isRecessedOverlay,
  })

  const confirmClose = useCallback(() => {
    finishClose()
  }, [finishClose])

  useEffect(() => {
    setMounted(true)
  }, [])

  useOverlayChromeLock(open && mounted)

  /* S10: History-Entry — Stack, damit Split-over → Split-over kein Fremd-Discard auslöst */
  useEffect(() => {
    if (!open || !mounted || !manageHistory) return
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
  }, [open, mounted, sheetId, handleHistoryPop, manageHistory])

  useEffect(() => {
    if (!open || !manageHistory) return
    updateEditorSheetHistoryPop(sheetId, handleHistoryPop)
  }, [open, sheetId, handleHistoryPop, manageHistory])

  /* Focus trap (Scroll-Lock über useOverlayChromeLock / body-scroll-lock).
   * Pausiert, wenn KI-Assistent über dem Sheet liegt.
   * requestClose per Ref — sonst Re-Init bei Parent-Rerender → Fokus klauen → Tastatur zu. */
  useEffect(() => {
    if (!open || !mounted || pauseFocusTrap) return
    const el = rootRef.current
    if (!el) return
    return trapFocus(el, () => requestCloseRef.current())
  }, [open, mounted, pauseFocusTrap])

  /* S7: Overlay deckt Layout-Viewport ab (nie auf vv.height schrumpfen — iOS-Lücke).
   * Sheet mit padding-bottom an sichtbaren Boden ankern (URL-Bar / Tastatur).
   * Recessed-Parent: kein Sync — sonst kämpfen zwei Overlays um Höhe/kb-open → Sheet hängt. */
  useEffect(() => {
    if (!open || !isMobile || !mounted || isRecessedOverlay) return
    const overlay = overlayRef.current
    const vv = window.visualViewport
    if (!overlay || !vv) return
    const sync = () => {
      const clientH = document.documentElement.clientHeight || window.innerHeight
      const coverH = Math.max(
        window.innerHeight,
        clientH,
        Math.round(vv.height + vv.offsetTop)
      )
      const visibleBottom = Math.round(vv.offsetTop + vv.height)
      const belowVisible = Math.max(0, coverH - visibleBottom)
      const byInner = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      const byClient = Math.max(0, clientH - vv.height)
      const rawKb = Math.min(byInner, byClient)
      const kb = rawKb > 100 ? Math.min(Math.round(rawKb), Math.round(window.innerHeight * 0.55)) : 0

      overlay.style.top = '0'
      overlay.style.left = '0'
      overlay.style.right = '0'
      overlay.style.bottom = '0'
      overlay.style.width = '100%'
      overlay.style.height = `${coverH}px`
      overlay.style.minHeight = `${coverH}px`
      /* Flex-Ende = sichtbarer Viewport-Boden (border-box schrumpft Content-Box) */
      overlay.style.paddingBottom = `${belowVisible}px`
      /* belowVisible deckt Tastatur/URL-Bar schon ab */
      overlay.style.setProperty('--keyboard-inset', '0px')
      document.body.classList.toggle('kb-open', kb > 40 || belowVisible > 100)
    }
    const onFocusIn = (e: FocusEvent) => {
      sync()
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      if (!overlay.contains(t)) return
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) return
      requestAnimationFrame(() => {
        t.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', sync)
      overlay.style.top = ''
      overlay.style.left = ''
      overlay.style.right = ''
      overlay.style.bottom = ''
      overlay.style.width = ''
      overlay.style.height = ''
      overlay.style.minHeight = ''
      overlay.style.paddingBottom = ''
      overlay.style.removeProperty('--keyboard-inset')
      document.body.classList.remove('kb-open')
    }
  }, [open, isMobile, mounted, isRecessedOverlay])

  if (!open || !mounted) return null

  const isRecessed = isRecessedOverlay
  const isStacked = isStackedOverlay

  const api: EditorSheetApi = { requestClose }

  const end =
    headerEnd ??
    (onConfirm ? (
      compose ? (
        <button
          type="button"
          className="editor-sheet__confirm-text"
          disabled={confirmDisabled || confirmBusy}
          onClick={handleConfirm}
        >
          {confirmBusy ? '…' : composeLabel}
        </button>
      ) : (
        <button
          type="button"
          className="editor-sheet__confirm"
          disabled={confirmDisabled || confirmBusy}
          onClick={handleConfirm}
          aria-label="Bestätigen"
          title="Bestätigen"
        >
          <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
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
        isRecessed && 'editor-sheet--recessed',
        isStacked && layout === 'bottom' && 'editor-sheet--stack-bottom',
        /* Fallback falls CSS-Build margin/justify droppt: Panel rechts ankern */
        layout === 'slide' && 'absolute right-0 top-0 ml-auto',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      /* Recessed: Klassen-Transform nicht von Swipe-Inline überschreiben */
      style={layout === 'bottom' && !isRecessed ? sheetMotionStyle : undefined}
    >
      {layout === 'bottom' ? (
        <div className="editor-sheet__drag-handle" {...dragZoneProps} aria-hidden>
          <div className="editor-sheet__drag-handle-bar" />
        </div>
      ) : null}
      {/* Drag nur am Handle — nicht am Header, sonst frisst iOS den X-Klick */}
      <header className="editor-sheet__header">
        <button
          type="button"
          className="editor-sheet__icon-btn"
          onClick={(e) => {
            e.stopPropagation()
            requestClose()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <div className="editor-sheet__title-block">
          {crumb ? <span className="editor-sheet__crumb">{crumb}</span> : null}
          <h2 id={titleId} className="editor-sheet__title">
            {title}
          </h2>
          {subtitle ? <p className="editor-sheet__subtitle">{subtitle}</p> : null}
        </div>
        <div className="editor-sheet__header-end">{end}</div>
      </header>
      <div className={cn('editor-sheet__body', bodyClassName)} data-scroll-lock-allow>
        {children}
      </div>
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
        ref={overlayRef}
        className={cn(
          'editor-sheet-overlay',
          `editor-sheet-overlay--${layout}`,
          /* Canvas/Wizard liegt bei z-index 400 — Sheet muss darüber (Position bearbeiten etc.) */
          context === 'canvas' && 'editor-sheet-overlay--over-wizard',
          layout === 'slide' && 'justify-end',
          discardOpen && 'editor-sheet-overlay--behind-confirm',
          overlayClassName
        )}
        role="presentation"
        onClick={(e) => {
          if (discardOpen) return
          if (e.target === e.currentTarget) requestClose()
        }}
      >
        {panel}
      </div>
      <ConfirmPopup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Änderungen verwerfen?"
        confirmLabel="Verwerfen"
        cancelLabel="Weiter bearbeiten"
        danger
        onConfirm={confirmClose}
      >
        Ungespeicherte Eingaben gehen verloren.
      </ConfirmPopup>
    </EditorSheetApiContext.Provider>,
    document.body
  )
}

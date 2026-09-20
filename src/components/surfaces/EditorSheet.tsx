'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
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
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { toast } from '@/components/ui/app-toast'
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
import { useAutoFormDirty } from '@/lib/surfaces/form-dirty'
import { CONFIRM, TOAST } from '@/lib/copy'
import { cn } from '@/lib/utils'

export type EditorSheetContext = 'detail' | 'canvas'

type EditorSheetApi = { requestClose: () => void }

const EditorSheetApiContext = createContext<EditorSheetApi | null>(null)

/** Für Footer-Abbrechen: gleicher Dirty-Confirm wie X/Swipe/Backdrop. */
export function useEditorSheetRequestClose(): (() => void) | null {
  return useContext(EditorSheetApiContext)?.requestClose ?? null
}

/** Feste Footer-Aktion (primary / secondary / danger). */
export type EditorSheetAction = {
  label: string
  onClick?: () => void
  href?: string
  download?: boolean | string
  disabled?: boolean
  busy?: boolean
  icon?: string
  /** Secondary-Slot: ghost statt secondary (Default secondary). */
  kind?: 'secondary' | 'ghost'
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
  /** Dirty → X/Swipe/Backdrop/Back öffnen Confirm (S8). Ohne Prop: Auto aus Formularfeldern. Override: true/false. */
  dirty?: boolean
  /** Compose: rechte Action = Text „Senden“ statt ✓ */
  compose?: boolean
  composeLabel?: string
  onConfirm?: () => void
  confirmDisabled?: boolean
  confirmBusy?: boolean
  /** Label für Confirm. Default „Speichern“ (Footer) bzw. Compose-Label. */
  confirmLabel?: string
  /**
   * Wo die Confirm-Aktion liegt.
   * Default: Compose → Header, sonst Footer.
   */
  confirmPlacement?: 'footer' | 'header'
  /** Optional statt ✓ / Senden (z. B. nur +) */
  headerEnd?: ReactNode
  /** Zusätzlicher Versuch zu schließen (Swipe etc.) */
  onDismissAttempt?: () => void
  className?: string
  bodyClassName?: string
  overlayClassName?: string
  size?: 'md' | 'lg'
  /**
   * Feste Footer-API — Secondary · Danger · Primary.
   * Kein freies `footer` ReactNode.
   */
  primary?: EditorSheetAction | null
  secondary?: EditorSheetAction | null
  danger?: EditorSheetAction | null
  /**
   * Browser-History für Back-to-Close (default true).
   * Aus bei Pickern vor einer Navigation — sonst frisst history.back() die neue URL.
   */
  manageHistory?: boolean
}

function EditorSheetFooterButton({
  action,
  slot,
  fallbackClick,
}: {
  action: EditorSheetAction
  slot: 'primary' | 'secondary' | 'danger'
  fallbackClick?: () => void
}) {
  const kind =
    slot === 'primary'
      ? 'primary'
      : slot === 'danger'
        ? 'danger'
        : (action.kind ?? 'secondary')
  const disabled = Boolean(action.disabled || action.busy)
  const label = action.busy ? '…' : action.label
  const onClick = action.onClick ?? fallbackClick

  if (action.href) {
    return (
      <a
        href={action.href}
        download={action.download}
        className={cn('btn', kind, 'inline-flex items-center justify-center gap-1.5')}
        aria-label={action.label}
      >
        {label}
      </a>
    )
  }

  return (
    <MockBtn
      kind={kind}
      type="button"
      icon={action.icon}
      disabled={disabled}
      loading={action.busy}
      onClick={() => {
        guardSheetPointerFallthrough()
        onClick?.()
      }}
    >
      {label}
    </MockBtn>
  )
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
  dirty: dirtyProp,
  compose = false,
  composeLabel = 'Senden',
  onConfirm,
  confirmDisabled,
  confirmBusy,
  confirmLabel: confirmLabelProp,
  confirmPlacement: confirmPlacementProp,
  headerEnd,
  onDismissAttempt,
  className,
  bodyClassName,
  overlayClassName,
  size = 'md',
  primary: primaryProp,
  secondary: secondaryProp,
  danger: dangerProp,
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
  const effectiveDirty = useAutoFormDirty(rootRef, open && mounted, dirtyProp)
  const dirtyRef = useRef(effectiveDirty)
  dirtyRef.current = effectiveDirty
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onDismissAttemptRef = useRef(onDismissAttempt)
  onDismissAttemptRef.current = onDismissAttempt
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  const confirmPlacement =
    confirmPlacementProp ?? (compose ? 'header' : 'footer')
  const confirmLabel =
    confirmLabelProp ?? (compose ? composeLabel : 'Speichern')
  const hasStructuredFooter = Boolean(primaryProp || secondaryProp || dangerProp)
  const showHeaderConfirm =
    Boolean(onConfirm) && confirmPlacement === 'header' && headerEnd == null
  const resolvedPrimary: EditorSheetAction | null =
    primaryProp ??
    (onConfirm && confirmPlacement === 'footer' && !hasStructuredFooter
      ? {
          label: confirmLabel,
          onClick: () => onConfirmRef.current?.(),
          disabled: confirmDisabled,
          busy: confirmBusy,
        }
      : null)
  const resolvedSecondary = secondaryProp ?? null
  const resolvedDanger = dangerProp ?? null

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

  const structuredFooterNode =
    resolvedPrimary || resolvedSecondary || resolvedDanger ? (
      <div className="sheet-footer-actions">
        {resolvedSecondary ? (
          <EditorSheetFooterButton
            action={resolvedSecondary}
            slot="secondary"
            fallbackClick={() => requestCloseRef.current()}
          />
        ) : null}
        {resolvedDanger ? (
          <EditorSheetFooterButton action={resolvedDanger} slot="danger" />
        ) : null}
        {resolvedPrimary ? (
          <EditorSheetFooterButton action={resolvedPrimary} slot="primary" />
        ) : null}
      </div>
    ) : null
  const resolvedFooter = structuredFooterNode

  /* Cmd/Ctrl+Enter → Speichern (Primary / onConfirm) */
  useEffect(() => {
    if (!open || !mounted) return
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return
      if (discardOpen || pauseFocusTrap) return
      const primary = resolvedPrimary
      if (primary && !primary.disabled && !primary.busy) {
        e.preventDefault()
        primary.onClick?.()
        return
      }
      if (onConfirmRef.current && !confirmDisabled && !confirmBusy) {
        e.preventDefault()
        onConfirmRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    open,
    mounted,
    discardOpen,
    pauseFocusTrap,
    resolvedPrimary,
    confirmDisabled,
    confirmBusy,
  ])

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
      const scrollField = () => {
        t.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        /* Speichern-Button über der Tastatur halten */
        const footer = overlay.querySelector('.editor-sheet__footer') as HTMLElement | null
        footer?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
      requestAnimationFrame(() => {
        scrollField()
        window.setTimeout(scrollField, 280)
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
    (showHeaderConfirm ? (
      compose ? (
        <MockBtn className="editor-sheet__confirm-text" type="button" disabled={confirmDisabled || confirmBusy} onClick={handleConfirm}>
          {confirmBusy ? '…' : confirmLabel}
        </MockBtn>
      ) : (
        <MockBtn className="editor-sheet__confirm" type="button" disabled={confirmDisabled || confirmBusy} onClick={handleConfirm} aria-label={confirmLabel} title={confirmLabel}>
          <MockIcon n="check" ctx="row" className="h-5 w-5" aria-hidden />
        </MockBtn>
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
        /* Fallback falls CSS-Build Höhe/Anker droppt: Panel rechts, volle Viewport-Höhe */
        layout === 'slide' && 'absolute right-0 top-0 bottom-0 h-full ml-auto',
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
        <MockBtn className="editor-sheet__icon-btn" type="button" onClick={(e) => {
            e.stopPropagation()
            requestClose()
          }} onPointerDown={(e) => e.stopPropagation()} aria-label="Schließen">
          <MockIcon n="x" ctx="default" className="h-5 w-5" aria-hidden />
        </MockBtn>
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
      {resolvedFooter ? (
        <EditorSheetApiContext.Provider value={api}>
          <div className="editor-sheet__footer">{resolvedFooter}</div>
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
        title={CONFIRM.dirty}
        confirmLabel={CONFIRM.discard}
        cancelLabel={CONFIRM.continueEditing}
        danger
        onConfirm={() => {
          toast.info(TOAST.nicht_gespeichert)
          confirmClose()
        }}
      >
        {CONFIRM.dirtyBody}
      </ConfirmPopup>
    </EditorSheetApiContext.Provider>,
    document.body
  )
}

'use client'

import {
  useCallback,
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
import { cn } from '@/lib/utils'

export type EditorSheetContext = 'detail' | 'canvas'

export type EditorSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  /** Optional Untertitel (z. B. Rechnungsnummer im RateDrawer) */
  subtitle?: string | null
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
  const historyPushed = useRef(false)

  const requestClose = useCallback(() => {
    onDismissAttempt?.()
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onClose()
  }, [dirty, onClose, onDismissAttempt])

  // Spec §6 / Phase 2: nie center — Desktop Slide, Mobil Bottom
  const layout: 'bottom' | 'slide' = isMobile ? 'bottom' : 'slide'

  const { dragZoneProps, sheetMotionStyle } = useSheetSwipeDismiss({
    onDismiss: requestClose,
    blocked: !open || layout !== 'bottom' || discardOpen,
  })

  const confirmClose = useCallback(() => {
    setDiscardOpen(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    setMounted(true)
  }, [])

  /* S10: History-Entry */
  useEffect(() => {
    if (!open || !mounted) return
    const key = `editor-sheet:${titleId}`
    window.history.pushState({ [key]: true }, '')
    historyPushed.current = true
    const onPop = () => {
      historyPushed.current = false
      if (dirty) {
        setDiscardOpen(true)
        window.history.pushState({ [key]: true }, '')
        historyPushed.current = true
        return
      }
      onClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (historyPushed.current) {
        historyPushed.current = false
        window.history.back()
      }
    }
  }, [open, mounted, dirty, onClose, titleId])

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
        <button
          type="button"
          className="editor-sheet__icon-btn"
          onClick={requestClose}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <div className="editor-sheet__title-block">
          <h2 id={titleId} className="editor-sheet__title">
            {title}
          </h2>
          {subtitle ? <p className="editor-sheet__subtitle">{subtitle}</p> : null}
        </div>
        <div className="editor-sheet__header-end">{end}</div>
      </header>
      <div className={cn('editor-sheet__body', bodyClassName)}>{children}</div>
      {footer ? <div className="editor-sheet__footer">{footer}</div> : null}
    </div>
  )

  return createPortal(
    <>
      <div
        className={cn(
          'editor-sheet-overlay',
          `editor-sheet-overlay--${layout}`,
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
    </>,
    document.body
  )
}

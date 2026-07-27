'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { ActionSheet } from '@/components/ui/ActionSheet'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

export type DocumentCanvasProps = {
  open?: boolean
  title: string
  onClose: () => void
  /** Speichern Entwurf (✓) — S9: X speichert implizit via onClose ohne Confirm */
  onSave?: () => void
  saveBusy?: boolean
  /** DocBar Verwerfen — einzige destruktive Exit mit Confirm */
  onDiscard?: () => void
  docActions?: ReactNode
  children: ReactNode
  className?: string
  /** Portal fullscreen (default true) */
  portal?: boolean
  /** Vollflächiger Lade-Overlay (z. B. Versand) */
  busy?: boolean
  busyLabel?: string
}

/**
 * Surface A — Dokument-Flow (Angebot/RE/Abnahme).
 * S9: X = schließen (Caller speichert Entwurf); Verwerfen nur über DocBar + Confirm.
 * S10: Back schließt Canvas wenn History gesetzt.
 */
export function DocumentCanvas({
  open = true,
  title,
  onClose,
  onSave,
  saveBusy,
  onDiscard,
  docActions,
  children,
  className,
  portal = true,
  busy,
  busyLabel,
}: DocumentCanvasProps) {
  const [mounted, setMounted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const [barCompact, setBarCompact] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const historyPushed = useRef(false)
  const saveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const requestDiscard = useCallback(() => {
    if (!onDiscard) return
    setDiscardOpen(true)
  }, [onDiscard])

  const handleSave = useCallback(() => {
    if (!onSave) return
    onSave()
    setSaveFlash(true)
    if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current)
    saveFlashTimer.current = setTimeout(() => setSaveFlash(false), 220)
  }, [onSave])

  useEffect(() => {
    return () => {
      if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open || !mounted || !portal) return
    window.history.pushState({ documentCanvas: true }, '')
    historyPushed.current = true
    const onPop = () => {
      historyPushed.current = false
      handleClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (historyPushed.current) {
        historyPushed.current = false
        window.history.back()
      }
    }
  }, [open, mounted, portal, handleClose])

  useEffect(() => {
    if (!open || !mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const el = rootRef.current
    const release = el ? trapFocus(el, () => handleClose()) : undefined
    return () => {
      document.body.style.overflow = prev
      release?.()
    }
  }, [open, mounted, handleClose])

  /* S7-ähnlich: Viewport für sticky DocBar */
  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    const vv = window.visualViewport
    if (!root || !vv) return
    const sync = () => {
      root.style.height = `${vv.height}px`
      root.style.top = `${vv.offsetTop}px`
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.height = ''
      root.style.top = ''
    }
  }, [open])

  /* Spec §10 / §16: DocBar kompakt beim Scrollen */
  useEffect(() => {
    if (!open) return
    const body = bodyRef.current
    if (!body) return
    let lastY = body.scrollTop
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = body.scrollTop
        const delta = y - lastY
        lastY = y
        if (y < 24) setBarCompact(false)
        else if (delta > 6) setBarCompact(true)
        else if (delta < -6) setBarCompact(false)
        ticking = false
      })
    }
    body.addEventListener('scroll', onScroll, { passive: true })
    return () => body.removeEventListener('scroll', onScroll)
  }, [open, mounted])

  if (!open || (portal && !mounted)) return null

  const interactionLocked = Boolean(busy || saveBusy)

  const ui = (
    <div
      ref={rootRef}
      className={cn('document-canvas relative', className)}
      role="dialog"
      aria-modal="true"
      aria-busy={interactionLocked || undefined}
    >
      <header className="document-canvas__header">
        <button
          type="button"
          className="editor-sheet__icon-btn"
          onClick={handleClose}
          disabled={interactionLocked}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="document-canvas__title">{title}</h1>
        {onSave ? (
          <button
            type="button"
            className={cn('editor-sheet__confirm', saveFlash && 'bw-motion-save-ok')}
            disabled={interactionLocked}
            onClick={handleSave}
            aria-label="Speichern"
            title="Speichern"
          >
            <Check className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <span className="editor-sheet__header-end" />
        )}
      </header>
      <div
        ref={bodyRef}
        className={cn('document-canvas__body', interactionLocked && 'pointer-events-none')}
      >
        <div className="document-canvas__paper">{children}</div>
      </div>
      {docActions ? (
        <footer
          className={cn(
            'document-canvas__docbar',
            barCompact && 'document-canvas__docbar--compact',
            interactionLocked && 'pointer-events-none opacity-60'
          )}
        >
          {docActions}
          {onDiscard ? (
            <button
              type="button"
              className="doc-action-bar__btn doc-action-bar__btn--danger"
              onClick={requestDiscard}
              disabled={interactionLocked}
              aria-label="Verwerfen"
              title="Verwerfen"
            >
              <TrashIcon />
            </button>
          ) : null}
        </footer>
      ) : null}
      {busy ? (
        <div
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-[var(--bg)]/88 backdrop-blur-[2px]"
          aria-live="polite"
        >
          <div className="page-loading__spinner page-loading__spinner--sm" aria-hidden />
          <p className="page-loading__label">{busyLabel?.trim() || 'Bitte warten…'}</p>
        </div>
      ) : null}
      <ActionSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Änderungen verwerfen?"
        items={[
          {
            label: 'Verwerfen',
            danger: true,
            onClick: () => {
              setDiscardOpen(false)
              onDiscard?.()
            },
          },
          {
            label: 'Weiter bearbeiten',
            onClick: () => setDiscardOpen(false),
          },
        ]}
      />
    </div>
  )

  if (!portal) return ui
  return createPortal(ui, document.body)
}

function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DocumentSection({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('document-section', className)}>
      <h2 className="document-section__label">{label}</h2>
      {children}
    </section>
  )
}

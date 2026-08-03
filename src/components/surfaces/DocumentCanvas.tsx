'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Trash2, X } from 'lucide-react'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { editorSheetStackDepth } from '@/lib/surfaces/editor-sheet-history'
import { cn } from '@/lib/utils'

export type DocumentCanvasProps = {
  open?: boolean
  title: string
  /** Untertitel unter dem Titel (Kunde · Region) */
  subtitle?: ReactNode
  onClose: () => void
  /** Speichern Entwurf (✓) — S9: X speichert implizit via onClose ohne Confirm */
  onSave?: () => void
  /** Wenn gesetzt: beschrifteter Header-CTA statt nur Check-Icon (Mock „Anfrage anlegen“) */
  saveLabel?: string
  saveBusy?: boolean
  /**
   * Ersetzt den Standard-✓ rechts im Header (z. B. Vorschau + Speichern/Senden-Menü).
   * Wenn gesetzt, werden onSave / saveLabel im Header ignoriert.
   */
  headerEnd?: ReactNode
  /** DocBar Verwerfen — einzige destruktive Exit mit Confirm */
  onDiscard?: () => void
  docActions?: ReactNode
  /** Legacy: gesamter Dokumentkörper (wenn document/meta fehlen) */
  children?: ReactNode
  /** Spec §6: Dokument-Spalte */
  document?: ReactNode
  /** Spec §6: Meta-Spalte (CollapseRow-Zeilen) */
  meta?: ReactNode
  /** Summenblock unten in der Meta-Spalte (mobil im Wizard mitscrollend) */
  metaSum?: ReactNode
  /** Mobil: Footer-CTA (im Positionswizard mitscrollend, nicht sticky) */
  footerCta?: ReactNode
  className?: string
  /** Portal fullscreen (default true) */
  portal?: boolean
  /**
   * Browser-Back schließt Canvas (default true).
   * Auf eigenen Routes (`/angebote/neu`) aus — sonst kämpft die History mit PickerSheets.
   */
  manageHistory?: boolean
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
  subtitle,
  onClose,
  onSave,
  saveLabel,
  saveBusy,
  headerEnd,
  onDiscard,
  docActions,
  children,
  document: documentSlot,
  meta,
  metaSum,
  footerCta,
  className,
  portal = true,
  manageHistory = true,
  busy,
  busyLabel,
}: DocumentCanvasProps) {
  // Client sofort mounten — sonst ein Frame Flash der darunterliegenden Seite (z. B. Vorgänge)
  const [mounted, setMounted] = useState(() => typeof document !== 'undefined')
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
  const handleCloseRef = useRef(handleClose)
  handleCloseRef.current = handleClose

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
    if (!open || !mounted || !portal || !manageHistory) return
    window.history.pushState({ documentCanvas: true }, '')
    historyPushed.current = true
    const onPop = (e: PopStateEvent) => {
      // Sheet geschlossen → wir landen wieder auf Canvas-State → offen lassen
      const st = e.state as { documentCanvas?: boolean } | null
      if (st?.documentCanvas) {
        historyPushed.current = true
        return
      }
      if (editorSheetStackDepth() > 0) return
      historyPushed.current = false
      handleCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (historyPushed.current) {
        historyPushed.current = false
        window.history.back()
      }
    }
  }, [open, mounted, portal, manageHistory])

  /* Body scroll lock + focus trap — Escape schließt nicht, solange ein EditorSheet offen ist.
   * handleClose absichtlich per Ref: sonst re-init bei jedem Parent-Rerender → Fokus klauen → iOS-Tastatur zu. */
  useEffect(() => {
    if (!open || !mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Floating Detail-CTAs / Bottom-Nav darunter dürfen keine Touches stehlen
    document.body.classList.add('has-document-canvas')
    const el = rootRef.current
    const release = el
      ? trapFocus(el, () => {
          if (editorSheetStackDepth() > 0) return
          handleCloseRef.current()
        })
      : undefined
    return () => {
      document.body.style.overflow = prev
      document.body.classList.remove('has-document-canvas')
      release?.()
    }
  }, [open, mounted])

  /* S7: iOS-Tastatur — Canvas bleibt Vollfläche (sonst Lücke → Dashboard sichtbar).
   * Nur --keyboard-inset setzen, damit Body/Footer über der Tastatur bleiben. */
  useEffect(() => {
    if (!open || !mounted) return
    const root = rootRef.current
    const vv = window.visualViewport
    if (!root || !vv) return

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) {
      root.style.top = ''
      root.style.height = ''
      root.style.minHeight = ''
      root.style.left = ''
      root.style.right = ''
      root.style.width = ''
      root.style.bottom = ''
      root.style.removeProperty('--keyboard-inset')
      return
    }

    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      // Immer Layout-Viewport abdecken — nie auf vv.height schrumpfen (iOS-Lücke)
      root.style.top = '0'
      root.style.left = '0'
      root.style.right = '0'
      root.style.bottom = '0'
      root.style.width = '100%'
      root.style.height = `${Math.max(window.innerHeight, vv.height + vv.offsetTop)}px`
      root.style.minHeight = `${window.innerHeight}px`
      root.style.setProperty('--keyboard-inset', `${kb}px`)
      document.body.classList.toggle('kb-open', kb > 40)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('focusin', sync)
    window.addEventListener('focusout', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('focusin', sync)
      window.removeEventListener('focusout', sync)
      root.style.height = ''
      root.style.minHeight = ''
      root.style.top = ''
      root.style.left = ''
      root.style.right = ''
      root.style.width = ''
      root.style.bottom = ''
      root.style.removeProperty('--keyboard-inset')
      document.body.classList.remove('kb-open')
    }
  }, [open, mounted])

  /* Fokussiertes Feld über die Tastatur scrollen */
  useEffect(() => {
    if (!open || !mounted) return
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      if (!rootRef.current?.contains(t)) return
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) return
      requestAnimationFrame(() => {
        t.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [open, mounted])

  /* Spec §10 / §16: DocBar kompakt beim Scrollen (Body oder Root bei Wizard-Mobil) */
  useEffect(() => {
    if (!open) return
    const body = bodyRef.current
    const root = rootRef.current
    if (!body && !root) return
    let lastY = 0
    let ticking = false
    const readY = () => {
      const bodyY = body?.scrollTop ?? 0
      const rootY = root?.scrollTop ?? 0
      return bodyY > 0 ? bodyY : rootY
    }
    lastY = readY()
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = readY()
        const delta = y - lastY
        lastY = y
        if (y < 24) setBarCompact(false)
        else if (delta > 6) setBarCompact(true)
        else if (delta < -6) setBarCompact(false)
        ticking = false
      })
    }
    body?.addEventListener('scroll', onScroll, { passive: true })
    root?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      body?.removeEventListener('scroll', onScroll)
      root?.removeEventListener('scroll', onScroll)
    }
  }, [open, mounted])

  if (!open || (portal && !mounted)) return null

  const interactionLocked = Boolean(busy || saveBusy)

  const ui = (
    <div
      ref={rootRef}
      className={cn('document-canvas', className)}
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
        <div className="document-canvas__title-block min-w-0 flex-1">
          <h1 className="document-canvas__title">{title}</h1>
          {subtitle ? (
            <p className="document-canvas__subtitle m-0 truncate text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerEnd != null ? (
          <div
            className={cn(
              'document-canvas__header-end',
              interactionLocked && 'pointer-events-none opacity-60'
            )}
          >
            {headerEnd}
          </div>
        ) : onSave ? (
          saveLabel ? (
            <button
              type="button"
              className={cn(
                'editor-sheet__confirm-text inline-flex items-center gap-1.5',
                saveFlash && 'bw-motion-save-ok'
              )}
              disabled={interactionLocked}
              onClick={handleSave}
            >
              <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
              {saveBusy ? '…' : saveLabel}
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                'editor-sheet__confirm',
                saveFlash && 'bw-motion-save-ok'
              )}
              disabled={interactionLocked}
              onClick={handleSave}
              aria-label="Speichern"
              title="Speichern"
            >
              <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
            </button>
          )
        ) : (
          <span className="editor-sheet__header-end" aria-hidden />
        )}
      </header>
      <div
        ref={bodyRef}
        className={cn('document-canvas__body', interactionLocked && 'pointer-events-none')}
      >
        {meta != null || documentSlot != null ? (
          <div className="document-canvas__split dc-split">
            <div className="document-canvas__paper document-canvas__paper--doc dc-doc">
              {documentSlot ?? children}
            </div>
            <aside className="document-canvas__meta dc-meta">
              <div className="document-canvas__meta-scroll">{meta}</div>
              {metaSum ? <div className="document-canvas__meta-sum">{metaSum}</div> : null}
            </aside>
          </div>
        ) : (
          <div className="document-canvas__paper">{children}</div>
        )}
      </div>
      {footerCta ? (
        <div className="document-canvas__footer-cta doccv-foot">{footerCta}</div>
      ) : null}
      {docActions || onDiscard ? (
        <footer
          className={cn(
            'document-canvas__docbar',
            barCompact && 'document-canvas__docbar--compact',
            interactionLocked && 'pointer-events-none opacity-60'
          )}
        >
          {onDiscard ? (
            <button
              type="button"
              className="doc-action-bar__btn doc-action-bar__btn--danger"
              onClick={requestDiscard}
              disabled={interactionLocked}
              aria-label="Verwerfen"
              title="Verwerfen"
            >
              <Trash2 size={22} strokeWidth={ACTION_ICON_STROKE} aria-hidden />
              <span className="doc-action-bar__lbl">Verwerfen</span>
            </button>
          ) : null}
          {docActions}
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
      <ConfirmPopup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Änderungen verwerfen?"
        confirmLabel="Verwerfen"
        cancelLabel="Weiter bearbeiten"
        danger
        onConfirm={() => {
          setDiscardOpen(false)
          onDiscard?.()
        }}
      >
        Ungespeicherte Eingaben gehen verloren.
      </ConfirmPopup>
    </div>
  )

  if (!portal) return ui
  return createPortal(ui, document.body)
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

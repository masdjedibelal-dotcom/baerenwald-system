'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { dismissSoftKeyboard } from '@/lib/a11y/dismiss-soft-keyboard'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import { editorSheetStackDepth, shouldIgnoreSuppressedEditorSheetPop } from '@/lib/surfaces/editor-sheet-history'
import { CONFIRM, COPY_BUTTON } from '@/lib/copy'
import { useAutoFormDirty } from '@/lib/surfaces/form-dirty'
import {
  formatChecklistLead,
  formatLastSavedAt,
  jumpToDocSection,
  type DocCanvasDraftAction,
  type DocCanvasGap,
  type DocCanvasPrimaryAction,
  type DocCanvasSection,
} from '@/lib/surfaces/document-canvas-chrome'
import { cn } from '@/lib/utils'

export type DocumentCanvasProps = {
  open?: boolean
  title: string
  /** Untertitel unter dem Titel (Kunde · Region) */
  subtitle?: ReactNode
  onClose: () => void
  /**
   * @deprecated Header-✓ — bevorzugt `draftAction` + `primaryAction` (Footer).
   * Wird ignoriert, wenn primaryAction/draftAction gesetzt sind.
   */
  onSave?: () => void
  /** @deprecated siehe onSave */
  saveLabel?: string
  saveBusy?: boolean
  /**
   * Header rechts (z. B. nur Vorschau). Kein Speichern-✓ wenn Footer-Chrome aktiv.
   */
  headerEnd?: ReactNode
  /** DocBar Verwerfen — Confirm „Änderungen verwerfen?“ */
  onDiscard?: () => void
  /**
   * Bei X/Escape/Back und draftDirty: Entwurf speichern & schließen
   * (dreistufiges Confirm wie AngebotWizard).
   */
  onSaveDraftClose?: () => void
  docActions?: ReactNode
  /** Legacy: gesamter Dokumentkörper (wenn document/meta fehlen) */
  children?: ReactNode
  /** Spec §6: Dokument-Spalte */
  document?: ReactNode
  /** Spec §6: Meta-Spalte (CollapseRow-Zeilen) */
  meta?: ReactNode
  /** Summenblock unten in der Meta-Spalte (mobil im Wizard mitscrollend) */
  metaSum?: ReactNode
  /** Zusätzlicher Footer-Inhalt (über der Action-Leiste) */
  footerCta?: ReactNode
  className?: string
  /** Portal fullscreen (default true) */
  portal?: boolean
  /**
   * Browser-Back schließt Canvas (default true).
   * Auf eigenen Routes (`/angebote/neu`) aus — sonst kämpft die History mit PickerSheets.
   */
  manageHistory?: boolean
  /** Ungespeicherte Änderungen — Close-Confirm bei X/Back wenn dirty. */
  draftDirty?: boolean
  /** Dezent im Kopf — wird von lastSavedAt überlagert, wenn gesetzt */
  statusHint?: string | null
  /** Timestamp letzter Speicherung → „Zuletzt gespeichert vor X Min.“ */
  lastSavedAt?: number | Date | null
  /** Gliederung: Abschnitte mit Haken „vollständig“ */
  sections?: DocCanvasSection[]
  /** Hauptaktion unten rechts (Text-Button) */
  primaryAction?: DocCanvasPrimaryAction
  /** Entwurf speichern — Sekundär links in der Footer-Leiste */
  draftAction?: DocCanvasDraftAction
  /** Vollflächiger Lade-Overlay (z. B. Versand) */
  busy?: boolean
  busyLabel?: string
}

/**
 * Surface A — Dokument-Flow (Angebot/RE/Abnahme).
 * X bei dirty → Confirm (Entwurf oder Verwerfen); ohne dirty → sofort schließen.
 * DocBar-Verwerfen nur über onDiscard + Confirm.
 * S10: Back schließt Canvas wenn History gesetzt (bei dirty mit Confirm).
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
  onSaveDraftClose,
  docActions,
  children,
  document: documentSlot,
  meta,
  metaSum,
  footerCta,
  className,
  portal = true,
  manageHistory = true,
  draftDirty: draftDirtyProp,
  statusHint,
  lastSavedAt,
  sections,
  primaryAction,
  draftAction,
  busy,
  busyLabel,
}: DocumentCanvasProps) {
  // Client sofort mounten — sonst ein Frame Flash der darunterliegenden Seite (z. B. Vorgänge)
  const [mounted, setMounted] = useState(() => typeof document !== 'undefined')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const [barCompact, setBarCompact] = useState(false)
  const [checklistGaps, setChecklistGaps] = useState<DocCanvasGap[]>([])
  const [nowTick, setNowTick] = useState(() => Date.now())
  const rootRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const historyPushed = useRef(false)
  const saveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const useFooterChrome = Boolean(primaryAction || draftAction)
  const lastSavedLabel = formatLastSavedAt(lastSavedAt, nowTick)
  const headerStatus = lastSavedLabel ?? statusHint ?? null

  const effectiveDirty = useAutoFormDirty(rootRef, open && mounted, draftDirtyProp)
  const draftDirtyRef = useRef(effectiveDirty)
  draftDirtyRef.current = effectiveDirty
  const onSaveDraftCloseRef = useRef(onSaveDraftClose)
  onSaveDraftCloseRef.current = onSaveDraftClose
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open || lastSavedAt == null) return
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [open, lastSavedAt])

  /* Speichern/Laden: Soft-Keyboard zu — sonst bleibt Fokus im Feld unter dem Overlay */
  useEffect(() => {
    if (!open) return
    if (busy || saveBusy || primaryAction?.busy || draftAction?.busy) dismissSoftKeyboard()
  }, [open, busy, saveBusy, primaryAction?.busy, draftAction?.busy])

  const finishClose = useCallback(() => {
    setCloseConfirmOpen(false)
    setDiscardOpen(false)
    onCloseRef.current()
  }, [])

  const requestClose = useCallback(() => {
    if (draftDirtyRef.current) {
      setCloseConfirmOpen(true)
      return
    }
    finishClose()
  }, [finishClose])
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  const handleClose = useCallback(() => {
    requestCloseRef.current()
  }, [])
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

  const handleDraftAction = useCallback(() => {
    if (!draftAction || draftAction.disabled || draftAction.busy) return
    draftAction.onClick()
    setSaveFlash(true)
    if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current)
    saveFlashTimer.current = setTimeout(() => setSaveFlash(false), 220)
  }, [draftAction])

  const handlePrimaryAction = useCallback(() => {
    if (!primaryAction || primaryAction.disabled || primaryAction.busy) return
    const gaps = primaryAction.getGaps?.() ?? []
    if (gaps.length > 0) {
      setChecklistGaps(gaps)
      return
    }
    setChecklistGaps([])
    primaryAction.onClick()
  }, [primaryAction])

  /* Cmd/Ctrl+Enter → Entwurf speichern, sonst Primary (Wizard) */
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return
      if (busy || saveBusy) return
      if (draftAction && !draftAction.disabled && !draftAction.busy) {
        e.preventDefault()
        handleDraftAction()
        return
      }
      if (primaryAction && !primaryAction.disabled && !primaryAction.busy) {
        e.preventDefault()
        handlePrimaryAction()
        return
      }
      if (onSave) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    open,
    busy,
    saveBusy,
    draftAction,
    primaryAction,
    onSave,
    handleDraftAction,
    handlePrimaryAction,
    handleSave,
  ])

  const onJumpGap = useCallback((gapId: string) => {
    jumpToDocSection(rootRef.current, gapId)
  }, [])

  const onJumpSection = useCallback((sectionId: string) => {
    jumpToDocSection(rootRef.current, sectionId)
  }, [])

  useEffect(() => {
    return () => {
      if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setCloseConfirmOpen(false)
      setDiscardOpen(false)
      setChecklistGaps([])
    }
  }, [open])

  useEffect(() => {
    if (!open || !mounted || !portal) return

    const onPop = (e: PopStateEvent) => {
      if (shouldIgnoreSuppressedEditorSheetPop()) return
      // Sheet geschlossen → wir landen wieder auf Canvas-State → offen lassen
      const st = e.state as { documentCanvas?: boolean; editorSheet?: string } | null
      if (st?.documentCanvas) {
        historyPushed.current = true
        return
      }
      // Offenes EditorSheet (Kunde/Kontakt/…) besitzt den Back — Canvas nicht stehlen
      if (editorSheetStackDepth() > 0) return

      /*
       * History-Eintrag ist weg (Back). Bei Dirty Confirm zeigen und History
       * wiederherstellen — sonst wirkt „Übernehmen“ im Kind-Sheet wie Wizard-Schließen.
       */
      window.history.pushState({ documentCanvas: true }, '')
      historyPushed.current = true
      handleCloseRef.current()
    }

    window.addEventListener('popstate', onPop)

    if (manageHistory || draftDirtyRef.current) {
      window.history.pushState({ documentCanvas: true }, '')
      historyPushed.current = true
    }

    return () => {
      window.removeEventListener('popstate', onPop)
      if (historyPushed.current) {
        historyPushed.current = false
        // Nicht backen solange Sheets offen — sonst schließt deren History den Canvas
        if (editorSheetStackDepth() === 0) {
          window.history.back()
        }
      }
    }
    // draftDirty absichtlich nicht in deps: sonst Cleanup+back bei Kontakt-Übernehmen
  }, [open, mounted, portal, manageHistory])

  /* Spät dirty geworden (z. B. Feld geändert) — History nachziehen, ohne Re-Init */
  useEffect(() => {
    if (!open || !mounted || !portal || manageHistory) return
    if (!effectiveDirty || historyPushed.current) return
    if (editorSheetStackDepth() > 0) return
    window.history.pushState({ documentCanvas: true }, '')
    historyPushed.current = true
  }, [open, mounted, portal, manageHistory, effectiveDirty])

  useOverlayChromeLock(Boolean(open && mounted))

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
      const rawKb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      // URL-Bar ≠ Soft-Keyboard — sonst Lücke / peekt Dashboard unten durch
      const kb = rawKb > 100 ? rawKb : 0
      const coverH = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight || 0,
        vv.height + vv.offsetTop
      )
      // Immer Layout-Viewport abdecken — nie auf vv.height schrumpfen (iOS-Lücke)
      root.style.top = '0'
      root.style.left = '0'
      root.style.right = '0'
      root.style.bottom = '0'
      root.style.width = '100%'
      root.style.height = `${coverH}px`
      root.style.minHeight = `${coverH}px`
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

  const interactionLocked = Boolean(
    busy || saveBusy || primaryAction?.busy || draftAction?.busy
  )
  const showLegacyHeaderSave = !useFooterChrome && Boolean(onSave) && headerEnd == null
  const checklistLead =
    checklistGaps.length > 0 ? formatChecklistLead(checklistGaps) : ''

  const ui = (
    <div
      ref={rootRef}
      className={cn('document-canvas', useFooterChrome && 'document-canvas--footer-chrome', className)}
      role="dialog"
      aria-modal="true"
      aria-busy={interactionLocked || undefined}
    >
      <header className="document-canvas__header">
        <MockBtn className="editor-sheet__icon-btn" type="button" onClick={handleClose} disabled={interactionLocked} aria-label="Schließen">
          <MockIcon n="x" ctx="row" className="h-5 w-5" aria-hidden />
        </MockBtn>
        <div className="document-canvas__title-block min-w-0 flex-1">
          <h1 className="document-canvas__title">{title}</h1>
          {subtitle ? (
            <p className="document-canvas__subtitle m-0 truncate text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
              {subtitle}
            </p>
          ) : null}
          {headerStatus ? (
            <p className="document-canvas__status-hint m-0 truncate text-[length:var(--fs-meta)] text-bw-text-muted opacity-80">
              {headerStatus}
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
        ) : showLegacyHeaderSave ? (
          saveLabel ? (
            <MockBtn className={cn(
                'editor-sheet__confirm-text inline-flex items-center gap-1.5',
                saveFlash && 'bw-motion-save-ok'
              )} type="button" disabled={interactionLocked} onClick={handleSave}>
              <MockIcon n="check" ctx="row" className="h-5 w-5" aria-hidden />
              {saveBusy ? '…' : saveLabel}
            </MockBtn>
          ) : (
            <MockBtn className={cn(
                'editor-sheet__confirm',
                saveFlash && 'bw-motion-save-ok'
              )} type="button" disabled={interactionLocked} onClick={handleSave} aria-label="Speichern" title="Speichern">
              <MockIcon n="check" ctx="row" className="h-5 w-5" aria-hidden />
            </MockBtn>
          )
        ) : (
          <span className="editor-sheet__header-end" aria-hidden />
        )}
      </header>
      {sections && sections.length > 0 ? (
        <nav className="document-canvas__outline" aria-label="Gliederung">
          {sections.map((s) => (
            <MockBtn
              key={s.id}
              type="button"
              className={cn(
                'document-canvas__outline-chip',
                s.complete && 'document-canvas__outline-chip--done'
              )}
              onClick={() => onJumpSection(s.id)}
              disabled={interactionLocked}
            >
              <MockIcon
                n={s.complete ? 'check' : 'circle'}
                ctx="row"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              <span>{s.label}</span>
            </MockBtn>
          ))}
        </nav>
      ) : null}
      {checklistGaps.length > 0 ? (
        <div className="document-canvas__checklist" role="alert">
          <p className="document-canvas__checklist-lead m-0">{checklistLead}</p>
          <ul className="document-canvas__checklist-list m-0">
            {checklistGaps.map((g) => (
              <li key={g.id}>
                <MockBtn
                  type="button"
                  className="document-canvas__checklist-jump"
                  onClick={() => onJumpGap(g.id)}
                  disabled={interactionLocked}
                >
                  {g.label}
                  <MockIcon n="chevron-right" ctx="row" className="h-3.5 w-3.5" aria-hidden />
                </MockBtn>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
      {useFooterChrome ? (
        <div
          className={cn(
            'document-canvas__actions',
            interactionLocked && 'pointer-events-none opacity-60'
          )}
        >
          {draftAction ? (
            <MockBtn
              type="button"
              kind="secondary"
              className={cn(saveFlash && 'bw-motion-save-ok')}
              disabled={interactionLocked || draftAction.disabled}
              onClick={handleDraftAction}
            >
              {draftAction.busy
                ? '…'
                : (draftAction.label ?? COPY_BUTTON.entwurfSpeichern)}
            </MockBtn>
          ) : (
            <span />
          )}
          {primaryAction ? (
            <MockBtn
              type="button"
              kind="primary"
              disabled={interactionLocked || primaryAction.disabled}
              onClick={handlePrimaryAction}
            >
              {primaryAction.busy ? '…' : primaryAction.label}
            </MockBtn>
          ) : null}
        </div>
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
            <MockBtn className="doc-action-bar__btn doc-action-bar__btn--danger" type="button" onClick={requestDiscard} disabled={interactionLocked} aria-label={COPY_BUTTON.verwerfen} title={COPY_BUTTON.verwerfen}>
              <MockIcon n="trash" ctx="row" size={22} aria-hidden />
              <span className="doc-action-bar__lbl">{COPY_BUTTON.verwerfen}</span>
            </MockBtn>
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
        title={CONFIRM.dirty}
        confirmLabel={CONFIRM.discard}
        cancelLabel={CONFIRM.continueEditing}
        danger
        onConfirm={() => {
          setDiscardOpen(false)
          onDiscard?.()
        }}
      >
        {CONFIRM.dirtyBody}
      </ConfirmPopup>
      <ConfirmPopup
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title={onSaveDraftClose ? 'Änderungen speichern?' : CONFIRM.dirty}
        cancelLabel={CONFIRM.continueEditing}
        confirmLabel={onSaveDraftClose ? undefined : CONFIRM.discard}
        discardLabel={onSaveDraftClose ? 'Beenden ohne Speichern' : undefined}
        saveDraftLabel={onSaveDraftClose ? CONFIRM.saveDraft : undefined}
        danger
        onConfirm={() => {
          finishClose()
        }}
        onSaveDraft={
          onSaveDraftClose
            ? () => {
                setCloseConfirmOpen(false)
                onSaveDraftClose()
              }
            : undefined
        }
      >
        {CONFIRM.dirtyBody}
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

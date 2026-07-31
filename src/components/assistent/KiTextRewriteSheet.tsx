'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import {
  KI_REWRITE_TONES,
  kiRewriteToneLabel,
  type KiRewriteTone,
} from '@/lib/copilot/ki-text-rewrite'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

const MAX_CHARS = 4000

/**
 * Mini-Rewrite über EditorSheets: Ton wählen → Generieren → Vorschlag editieren → Übernehmen.
 */
export function KiTextRewriteSheet({
  open,
  onClose,
  fieldLabel,
  sourceText,
  extraHint,
  multiline = true,
  onApply,
}: {
  open: boolean
  onClose: () => void
  fieldLabel: string
  sourceText: string
  extraHint?: string | null
  multiline?: boolean
  onApply: (text: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [tone, setTone] = useState<KiRewriteTone>('standard')
  const [userNote, setUserNote] = useState('')
  const [proposal, setProposal] = useState('')
  const [phase, setPhase] = useState<'setup' | 'result'>('setup')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setTone('standard')
    setUserNote('')
    setProposal('')
    setPhase('setup')
    setPending(false)
    window.dispatchEvent(new CustomEvent('ki-field-overlay', { detail: { open: true } }))
    return () => {
      window.dispatchEvent(new CustomEvent('ki-field-overlay', { detail: { open: false } }))
    }
  }, [open])

  async function generieren() {
    setPending(true)
    try {
      const res = await fetch('/api/copilot/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          fieldLabel,
          tone,
          extraHint: extraHint ?? null,
          userNote: userNote.trim() || null,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; text?: string; error?: string }
      if (!res.ok || !json.ok || !json.text?.trim()) {
        toast.error(json.error || 'Umschreiben fehlgeschlagen')
        return
      }
      setProposal(json.text.trim().slice(0, MAX_CHARS))
      setPhase('result')
    } catch {
      toast.error('Netzwerkfehler beim Umschreiben')
    } finally {
      setPending(false)
    }
  }

  function uebernehmen() {
    const t = proposal.trim()
    if (!t) {
      toast.error('Vorschlag ist leer')
      return
    }
    onApply(t)
    toast.success('Text übernommen')
    onClose()
  }

  if (!open || !mounted) return null

  const ui = (
    <>
      <button
        type="button"
        className="ki-rewrite-scrim"
        aria-label="Schließen"
        onClick={() => !pending && onClose()}
      />
      <aside className="ki-rewrite-sheet" role="dialog" aria-label={`KI · ${fieldLabel}`}>
        <header className="ki-rewrite-sheet__head">
          <button
            type="button"
            className="editor-sheet__icon-btn"
            onClick={() => !pending && onClose()}
            aria-label="Schließen"
            disabled={pending}
          >
            <X className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
          </button>
          <div className="ki-rewrite-sheet__title-block">
            <h2 className="ki-rewrite-sheet__title">KI · {fieldLabel}</h2>
            <p className="ki-rewrite-sheet__sub">
              {phase === 'setup' ? 'Umschreiben für dieses Feld' : 'Vorschlag prüfen und anpassen'}
            </p>
          </div>
          <span className="editor-sheet__header-end" aria-hidden />
        </header>

        <div className="ki-rewrite-sheet__body">
          {phase === 'setup' ? (
            <>
              <div className="ki-rewrite-sheet__block">
                <div className="ki-rewrite-sheet__lbl">Aktuell</div>
                <div className="ki-rewrite-sheet__current">
                  {sourceText.trim() || (
                    <span className="text-bw-text-muted">Noch kein Text — KI formuliert aus dem Kontext.</span>
                  )}
                </div>
              </div>

              <div className="ki-rewrite-sheet__block">
                <div className="ki-rewrite-sheet__lbl">Ton</div>
                <div className="picker-sheet__chips" role="group" aria-label="Ton">
                  {KI_REWRITE_TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn('picker-sheet__chip', tone === t.id && 'is-active')}
                      disabled={pending}
                      title={t.hint}
                      onClick={() => setTone(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ki-rewrite-sheet__block">
                <div className="ki-rewrite-sheet__lbl">Optional</div>
                <input
                  className="input"
                  value={userNote}
                  disabled={pending}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="z. B. mehr Wertschätzung, ohne Floskeln…"
                />
              </div>
            </>
          ) : (
            <>
              <div className="ki-rewrite-sheet__tone-row">
                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  Ton: {kiRewriteToneLabel(tone)}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={pending}
                  onClick={() => setPhase('setup')}
                >
                  Ändern
                </button>
              </div>

              <div className="ki-rewrite-sheet__block">
                <div className="ki-rewrite-sheet__lbl">Vorschlag</div>
                {multiline ? (
                  <textarea
                    className="input ta ki-rewrite-sheet__proposal"
                    rows={8}
                    value={proposal}
                    disabled={pending}
                    maxLength={MAX_CHARS}
                    onChange={(e) => setProposal(e.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    value={proposal}
                    disabled={pending}
                    maxLength={MAX_CHARS}
                    onChange={(e) => setProposal(e.target.value)}
                  />
                )}
                <p className="ki-rewrite-sheet__count">
                  {proposal.length}/{MAX_CHARS}
                </p>
              </div>
            </>
          )}

          {pending ? (
            <div className="ki-rewrite-sheet__loading" aria-live="polite">
              <span className="page-loading__spinner page-loading__spinner--sm" aria-hidden />
              Schreibt Vorschlag…
            </div>
          ) : null}
        </div>

        <footer className="ki-rewrite-sheet__foot">
          {phase === 'setup' ? (
            <div className="sheet-footer-actions">
              <MockBtn kind="primary" icon="sparkles" disabled={pending} onClick={() => void generieren()}>
                Generieren
              </MockBtn>
            </div>
          ) : (
            <div className="sheet-footer-actions">
              <MockBtn kind="secondary" disabled={pending} onClick={() => void generieren()}>
                Nochmal
              </MockBtn>
              <MockBtn kind="primary" icon="check" disabled={pending || !proposal.trim()} onClick={uebernehmen}>
                Übernehmen
              </MockBtn>
            </div>
          )}
        </footer>
      </aside>
    </>
  )

  return createPortal(ui, document.body)
}

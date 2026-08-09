'use client'

import { useId, useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistentOptional } from '@/components/assistent/AssistentProvider'
import { useKiAssistDraftConsumer } from '@/components/assistent/useKiAssistDraftConsumer'
import { cn } from '@/lib/utils'

/** Welches Feld zuletzt den Assistenten geöffnet hat (nur einer konsumiert text-Drafts). */
let activeFieldAssistId: string | null = null

/**
 * Label + Sparkles → Assistent-Chat über dem Sheet, trainiert nur auf dieses eine Feld.
 * Prompt frei formulieren → Übernehmen schreibt den neuen Feldtext.
 */
export function KiAssistFieldLabel({
  label,
  value,
  onApply,
  extraHint,
  required,
  className,
  children,
  multiline: _multiline = true,
  disabled,
}: {
  label: ReactNode
  /** Aktueller Feldtext — Quelle fürs Umschreiben */
  value: string
  /** Übernahme in das Feld */
  onApply: (text: string) => void
  extraHint?: string | null
  required?: boolean
  className?: string
  children?: ReactNode
  /** @deprecated Chat übernimmt Ein-/Mehrzeiler */
  multiline?: boolean
  disabled?: boolean
}) {
  void _multiline
  const assistent = useAssistentOptional()
  const fieldId = useId()
  const [awaiting, setAwaiting] = useState(false)
  const labelText = typeof label === 'string' ? label : 'Text'

  useKiAssistDraftConsumer(awaiting && activeFieldAssistId === fieldId, 'text', (d) => {
    if (d.type !== 'text') return
    const text = d.text.trim()
    if (!text) return
    onApply(text)
    setAwaiting(false)
    if (activeFieldAssistId === fieldId) activeFieldAssistId = null
  })

  function openFieldChat() {
    if (!assistent || disabled) return
    activeFieldAssistId = fieldId
    setAwaiting(true)
    const current = value.trim()
    const hintParts = [
      `Feldname: ${labelText}`,
      extraHint?.trim() ? `Hinweis: ${extraHint.trim()}` : null,
      'Aktueller Feldtext (nur dieses Feld umschreiben/ersetzen):',
      current
        ? `"""\n${current}\n"""`
        : '(leer — formuliere einen passenden neuen Text)',
    ].filter(Boolean)
    assistent.openScoped({
      scopeId: 'feld',
      extraHint: hintParts.join('\n'),
      draftInput: null,
      layer: 'over-sheet',
    })
  }

  return (
    <div className={cn('ki-assist-field', className)}>
      <div className="lt-field-lbl lt-field-lbl--with-ki">
        <span>
          {label}
          {required ? <span className="req"> *</span> : null}
        </span>
        <button
          type="button"
          className="ki-assist-icon-btn"
          title={`KI: ${labelText} umschreiben`}
          aria-label={`KI: ${labelText} umschreiben`}
          disabled={disabled || !assistent}
          onClick={openFieldChat}
        >
          <MockIcon ctx="btn" n="sparkles" size={16} />
        </button>
      </div>
      {children}
    </div>
  )
}

'use client'

import { useState, type ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { KiTextRewriteSheet } from '@/components/assistent/KiTextRewriteSheet'
import { cn } from '@/lib/utils'

/**
 * Label + Sparkles für Textblöcke → Inline-Rewrite-Sheet (kein globaler Assistent).
 */
export function KiAssistFieldLabel({
  label,
  value,
  onApply,
  extraHint,
  required,
  className,
  children,
  multiline = true,
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
  /** Einzeiler (Betreff) vs. Textarea */
  multiline?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const labelText = typeof label === 'string' ? label : 'Text'

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
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <MockIcon ctx="btn" n="sparkles" size={16} />
        </button>
      </div>
      {children}
      <KiTextRewriteSheet
        open={open}
        onClose={() => setOpen(false)}
        fieldLabel={labelText}
        sourceText={value}
        extraHint={extraHint}
        multiline={multiline}
        onApply={onApply}
      />
    </div>
  )
}

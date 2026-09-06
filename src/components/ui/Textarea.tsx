'use client'

import { forwardRef, useCallback, type ChangeEvent, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

/** ~12–16 Zeilen Schreibfläche (Langtext / Beschreibung). */
export const TEXTAREA_LONG_ROWS = 14
const LONG_MIN_PX = 192 // ≈ 12rem

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  /** Ohne Rich-Text-Toolbar (z. B. strukturierter Mail-Text, Monospace). */
  plain?: boolean
  /**
   * Langtext-Beschreibung: große Schreibfläche + Scroll im Feld.
   * Titel bleiben 1-Zeiler (`Input`) — nur für Beschreibung nutzen.
   */
  long?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, plain, long, rows, value, onChange, disabled, placeholder, ...props },
  ref
) {
  const inputId = id ?? props.name
  const effectiveRows = long ? (rows ?? TEXTAREA_LONG_ROWS) : rows
  const minHeight =
    typeof effectiveRows === 'number'
      ? Math.max(effectiveRows * 24, long ? LONG_MIN_PX : 72)
      : long
        ? LONG_MIN_PX
        : 120

  const emitChange = useCallback(
    (next: string) => {
      if (!onChange) return
      const synthetic = {
        target: { value: next },
        currentTarget: { value: next },
      } as ChangeEvent<HTMLTextAreaElement>
      onChange(synthetic)
    },
    [onChange]
  )

  return (
    <div className="w-full">
      {label ? (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      {plain ? (
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'input resize-y py-2',
            long ? 'ta--long' : 'min-h-[120px]',
            error && 'input-error',
            className
          )}
          rows={effectiveRows}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          {...props}
        />
      ) : (
        <RichTextEditor
          id={inputId}
          value={typeof value === 'string' ? value : ''}
          onChange={emitChange}
          disabled={disabled}
          placeholder={placeholder}
          minHeight={minHeight}
          className={cn(long && 'ta--long', error && 'border-danger', className)}
          aria-label={label ?? placeholder}
        />
      )}
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
})

Textarea.displayName = 'Textarea'

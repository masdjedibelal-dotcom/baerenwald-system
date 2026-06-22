'use client'

import { forwardRef, useCallback, type ChangeEvent, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  /** Ohne Rich-Text-Toolbar (z. B. strukturierter Mail-Text, Monospace). */
  plain?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, plain, rows, value, onChange, disabled, placeholder, ...props },
  ref
) {
  const inputId = id ?? props.name
  const minHeight = typeof rows === 'number' ? Math.max(rows * 24, 72) : 120

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
          className={cn('input min-h-[120px] resize-y py-2', error && 'input-error', className)}
          rows={rows}
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
          className={cn(error && 'border-danger', className)}
          aria-label={label ?? placeholder}
        />
      )}
      {hint && !error ? <p className="mt-1 text-xs text-bw-light">{hint}</p> : null}
      {error ? <p className="input-error-msg">{error}</p> : null}
    </div>
  )
})

Textarea.displayName = 'Textarea'

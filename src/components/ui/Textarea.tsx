import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, label, hint, error, id, ...props }, ref) {
    const inputId = id ?? props.name
    return (
      <label className="block w-full space-y-1.5" htmlFor={inputId}>
        {label ? (
          <span className="block text-base font-medium text-ink">{label}</span>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[120px] rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        />
        {hint && !error ? (
          <span className="block text-sm text-muted">{hint}</span>
        ) : null}
        {error ? (
          <span className="block text-sm text-danger">{error}</span>
        ) : null}
      </label>
    )
  }
)

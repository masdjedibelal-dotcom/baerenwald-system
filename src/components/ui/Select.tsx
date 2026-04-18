import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, label, hint, error, id, options, ...props }, ref) {
    const inputId = id ?? props.name
    return (
      <label className="block w-full space-y-1.5" htmlFor={inputId}>
        {label ? (
          <span className="block text-base font-medium text-ink">{label}</span>
        ) : null}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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

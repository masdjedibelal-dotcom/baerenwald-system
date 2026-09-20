/**
 * MockField: required→Sternchen, error→Rahmen + Text, aria-invalid am Kind.
 */
'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

/** Native Text-Input mit Mock-`.input` — P5-5 Kanon (Allowlist MockForm). */
export const MockInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function MockInput({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} {...props} type={type} className={cn('input', className)} />
  }
)

/** Native Select mit Mock-`.input`. */
export const MockSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function MockSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn('input', className)} {...props}>
        {children}
      </select>
    )
  }
)

/** Native Textarea mit Mock-`.input`. */
export const MockTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function MockTextarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input', className)} {...props} />
})

/** Mock `FormSection` — Sektionskopf + form-grid */
export function MockFormSection({
  title,
  icon,
  actions,
  children,
  columns,
  className,
}: {
  title?: string
  icon?: string
  actions?: ReactNode
  children: ReactNode
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('form-section', className)}>
      {title ? (
        <div className="form-section-h" style={actions ? { display: 'flex', alignItems: 'center', gap: 8 } : undefined}>
          {icon ? <MockIcon ctx="default" n={icon} size={13} /> : null}
          <span style={{ flex: actions ? 1 : undefined }}>{title}</span>
          {actions}
        </div>
      ) : null}
      <div
        className="form-grid form-grid--sheet"
        style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

/** Mock `Field` — required=*, error=roter Rahmen + Text, aria-invalid. */
export function MockField({
  label,
  required,
  hint,
  error,
  children,
  full,
  className,
  name,
}: {
  label?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  full?: boolean
  className?: string
  /** data-field für Fokus nach Validierung */
  name?: string
}) {
  const reactId = useId()
  const errorId = `${reactId}-err`
  const kids = Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const el = child as ReactElement<Record<string, unknown>>
    return cloneElement(el, {
      'aria-invalid': error ? true : el.props['aria-invalid'],
      'aria-required': required ? true : el.props['aria-required'],
      'aria-describedby': error
        ? [el.props['aria-describedby'], errorId].filter(Boolean).join(' ')
        : el.props['aria-describedby'],
    })
  })
  return (
    <div
      className={cn('field', full && 'full', error && 'has-error', className)}
      data-field={name || undefined}
    >
      {label ? (
        <label className="field-label">
          {label}
          {required ? <span className="req" aria-hidden>*</span> : null}
        </label>
      ) : null}
      {kids}
      {hint && !error ? <div className="field-hint">{hint}</div> : null}
      {error ? (
        <div id={errorId} className="field-hint field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}

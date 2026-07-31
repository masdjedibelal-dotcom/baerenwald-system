'use client'

import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type MouseEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Zusätzliche Klasse am äußeren Wrapper */
  wrapperClassName?: string
  /** Kompakt (Filter, Range-Rows) */
  size?: 'sm' | 'md'
}

/**
 * Datumsfeld: Text linksbündig, Kalender-Icon rechts öffnet den nativen Picker.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, wrapperClassName, disabled, onClick, size = 'md', ...props },
  ref
) {
  const localRef = useRef<HTMLInputElement | null>(null)

  function setRefs(node: HTMLInputElement | null) {
    localRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  function openPicker(e?: MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    const el = localRef.current
    if (!el || disabled) return
    try {
      el.showPicker?.()
    } catch {
      el.focus()
      el.click()
    }
  }

  return (
    <div
      className={cn(
        'date-field',
        size === 'sm' && 'date-field--sm',
        disabled && 'is-disabled',
        wrapperClassName
      )}
    >
      <input
        ref={setRefs}
        type="date"
        className={cn('input date-field__input', size === 'sm' && 'input--sm', className)}
        disabled={disabled}
        onClick={onClick}
        {...props}
      />
      <button
        type="button"
        className="date-field__icon"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Kalender öffnen"
        title="Kalender öffnen"
        onClick={openPicker}
      >
        <MockIcon ctx="btn" n="calendar" size={size === 'sm' ? 14 : 15} />
      </button>
    </div>
  )
})

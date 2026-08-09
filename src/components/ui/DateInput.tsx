'use client'

import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type PointerEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Zusätzliche Klasse am äußeren Wrapper */
  wrapperClassName?: string
  /** Kompakt (Filter, Range-Rows) */
  size?: 'sm' | 'md'
}

function openNativePicker(el: HTMLInputElement | null, disabled?: boolean) {
  if (!el || disabled) return
  el.focus({ preventScroll: true })
  try {
    if (typeof el.showPicker === 'function') {
      void el.showPicker()
      return
    }
  } catch {
    /* showPicker kann je nach Browser scheitern */
  }
  el.click()
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

  function onIconPointerDown(e: PointerEvent<HTMLButtonElement>) {
    // pointerdown: User-Geste für showPicker; kein preventDefault (sonst kann der Picker blocken)
    e.stopPropagation()
    openNativePicker(localRef.current, disabled)
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
        onPointerDown={onIconPointerDown}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <MockIcon ctx="btn" n="calendar" size={size === 'sm' ? 14 : 15} />
      </button>
    </div>
  )
})

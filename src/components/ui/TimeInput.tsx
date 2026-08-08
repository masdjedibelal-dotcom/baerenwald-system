'use client'

import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type PointerEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
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
 * Uhrzeitfeld: Text linksbündig, Uhr-Icon rechts öffnet den nativen Picker.
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
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
    e.stopPropagation()
    openNativePicker(localRef.current, disabled)
  }

  return (
    <div
      className={cn(
        'time-field',
        size === 'sm' && 'time-field--sm',
        disabled && 'is-disabled',
        wrapperClassName
      )}
    >
      <input
        ref={setRefs}
        type="time"
        className={cn('input time-field__input', size === 'sm' && 'input--sm', className)}
        disabled={disabled}
        onClick={onClick}
        {...props}
      />
      <button
        type="button"
        className="time-field__icon"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Uhrzeit wählen"
        title="Uhrzeit wählen"
        onPointerDown={onIconPointerDown}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <MockIcon ctx="btn" n="clock" size={size === 'sm' ? 14 : 15} />
      </button>
    </div>
  )
})

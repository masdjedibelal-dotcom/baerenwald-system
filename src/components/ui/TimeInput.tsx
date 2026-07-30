'use client'

import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type MouseEvent,
} from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Zusätzliche Klasse am äußeren Wrapper */
  wrapperClassName?: string
}

/**
 * Uhrzeitfeld: Text linksbündig, Uhr-Icon rechts öffnet den nativen Picker.
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { className, wrapperClassName, disabled, onClick, ...props },
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
    <div className={cn('time-field', disabled && 'is-disabled', wrapperClassName)}>
      <input
        ref={setRefs}
        type="time"
        className={cn('input time-field__input', className)}
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
        onClick={openPicker}
      >
        <MockIcon ctx="btn" n="clock" size={15} />
      </button>
    </div>
  )
})

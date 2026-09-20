'use client'

import {
  forwardRef,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type Ref,
} from 'react'
import { cn } from '@/lib/utils'

export type MockCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Indeterminate (Header „teilweise ausgewählt“) */
  indeterminate?: boolean
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const r of refs) {
      if (!r) continue
      if (typeof r === 'function') r(node)
      else (r as { current: T | null }).current = node
    }
  }
}

/**
 * Kanonische Checkbox — einzige Stelle mit `type="checkbox"`.
 * Listen: `ListRowCheck` rendert sie intern.
 */
export const MockCheckbox = forwardRef<HTMLInputElement, MockCheckboxProps>(
  function MockCheckbox({ className, indeterminate = false, ...props }, ref) {
    const localRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      const el = localRef.current
      if (el) el.indeterminate = Boolean(indeterminate)
    }, [indeterminate])

    return (
      <input
        ref={mergeRefs(localRef, ref)}
        type="checkbox"
        className={cn('mock-checkbox', className)}
        {...props}
      />
    )
  }
)

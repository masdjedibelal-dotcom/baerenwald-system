'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Einmalig true, sobald das Element (nahe) im Viewport ist.
 * Für Lazy-Mount von Charts / schweren Dashboard-Blöcken.
 */
export function useInViewOnce(rootMargin = '160px 0px'): {
  ref: RefObject<HTMLDivElement>
  inView: boolean
} {
  const ref = useRef<HTMLDivElement>(null!)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}

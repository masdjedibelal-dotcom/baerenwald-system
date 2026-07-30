'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollChrome = {
  /** Seite ist etwas gescrollt (Kopf kompakt) */
  scrolled: boolean
  /** Nach unten gescrollt → Chrome ausblenden */
  hideChrome: boolean
}

/**
 * Mobil-Chrome: kompakter Kopf ab ~40px,
 * hideChrome = Scroll nach unten (Legacy; Detail-CTA nutzt `scrolled` für Glass-Kompakt).
 */
export function useMobileScrollChrome(enabled: boolean): ScrollChrome {
  const [scrolled, setScrolled] = useState(false)
  const [hideChrome, setHideChrome] = useState(false)
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    if (!enabled) {
      setScrolled(false)
      setHideChrome(false)
      return
    }

    lastY.current = window.scrollY

    const update = () => {
      ticking.current = false
      const y = window.scrollY
      const prev = lastY.current
      const delta = y - prev

      setScrolled(y > 36)

      if (y < 48) {
        setHideChrome(false)
      } else if (delta > 6) {
        setHideChrome(true)
      } else if (delta < -6) {
        setHideChrome(false)
      }

      lastY.current = y
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  return { scrolled, hideChrome }
}

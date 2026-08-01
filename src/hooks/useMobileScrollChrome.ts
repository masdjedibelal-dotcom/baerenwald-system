'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollChrome = {
  /** Seite ist etwas gescrollt (Kopf kompakt) */
  scrolled: boolean
  /** Nach unten gescrollt → Chrome ausblenden */
  hideChrome: boolean
}

/** App-Shell scrollt in `main.page`, nicht auf `window`. */
function resolvePageScroller(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector<HTMLElement>('main.page')
}

/**
 * Mobil-Chrome: scrolled ab ~36px (Detail Hybrid: Nav ↔ CTA).
 * hideChrome = Scroll-Richtung (Legacy).
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

    const page = resolvePageScroller()
    const getY = () => (page ? page.scrollTop : window.scrollY || 0)

    lastY.current = getY()

    const update = () => {
      ticking.current = false
      const y = getY()
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
    const target: EventTarget = page ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [enabled])

  return { scrolled, hideChrome }
}

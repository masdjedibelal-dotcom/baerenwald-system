'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollChrome = {
  /** Seite ist etwas gescrollt (Kopf kompakt) */
  scrolled: boolean
  /** Nach unten gescrollt → Chrome ausblenden */
  hideChrome: boolean
}

/** Desktop: App-Shell scrollt in `main.page`. Mobil: oft Dokument-Scroll (window). */
function pageIsScrollContainer(page: HTMLElement): boolean {
  const style = window.getComputedStyle(page)
  const oy = style.overflowY
  return (
    (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
    page.scrollHeight > page.clientHeight + 1
  )
}

/**
 * Scroll-Ziel: nur `main.page`, wenn es wirklich scrollt — sonst window
 * (Mobil: `.page { overflow: visible }` → Dokument-Scroll).
 */
function resolveScrollTarget(): { getY: () => number; target: EventTarget } {
  const page =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('main.page')
      : null
  if (page && pageIsScrollContainer(page)) {
    return {
      getY: () => page.scrollTop,
      target: page,
    }
  }
  return {
    getY: () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0,
    target: window,
  }
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

    const { getY, target } = resolveScrollTarget()

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
    target.addEventListener('scroll', onScroll, { passive: true })
    /* Nach Overlay/Scroll-Lock: Position neu lesen (body-scroll-lock feuert das). */
    window.addEventListener('bw:scroll-chrome-sync', onScroll)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('bw:scroll-chrome-sync', onScroll)
    }
  }, [enabled])

  return { scrolled, hideChrome }
}

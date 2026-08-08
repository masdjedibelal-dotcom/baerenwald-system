'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollChrome = {
  /** Seite ist etwas gescrollt (Kopf kompakt) */
  scrolled: boolean
  /** Nach unten gescrollt → Chrome ausblenden */
  hideChrome: boolean
}

type ScrollSource = {
  getY: () => number
  target: EventTarget
}

/**
 * Mobil: Dokument-Scroll (window) oder Innen-Scroll in `main.page`.
 * Früher immer `page.scrollTop` → bei overflow:visible immer 0 → Hybrid Nav/CTA kaputt.
 */
function resolveScrollSource(): ScrollSource {
  if (typeof document === 'undefined') {
    return { getY: () => 0, target: window }
  }
  const page = document.querySelector<HTMLElement>('main.page')
  if (page) {
    const style = window.getComputedStyle(page)
    const oy = style.overflowY
    const scrollsInside =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      page.scrollHeight > page.clientHeight + 1
    if (scrollsInside) {
      return { getY: () => page.scrollTop, target: page }
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

function chromeFrozen(): boolean {
  if (typeof document === 'undefined') return false
  const b = document.body
  return (
    b.classList.contains('has-blocking-overlay') ||
    b.classList.contains('has-body-scroll-lock') ||
    b.classList.contains('has-document-canvas')
  )
}

/**
 * Mobil-Chrome: scrolled ab ~36px (Detail Hybrid: Nav ↔ CTA).
 * hideChrome = Scroll-Richtung (Legacy).
 * Während Overlay/Scroll-Lock: Zustand einfrieren (body position:fixed → scrollY=0).
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

    const { getY, target } = resolveScrollSource()
    lastY.current = getY()

    const update = () => {
      ticking.current = false
      if (chromeFrozen()) return

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
    // Nach Overlay-Close: Lock restored scroll — einmal nachziehen
    window.addEventListener('bw:scroll-chrome-sync', onScroll)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('bw:scroll-chrome-sync', onScroll)
    }
  }, [enabled])

  return { scrolled, hideChrome }
}

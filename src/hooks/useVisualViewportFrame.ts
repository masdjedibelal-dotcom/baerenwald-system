'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Pinnt ein fixed Overlay an den sichtbaren visualViewport (iOS-PWA / Tastatur).
 * Verhindert tote Klickzonen, wenn 100dvh größer als der tippbare Bereich ist
 * und Bottom-Nav / Home-Indicator darunter durchscheinen.
 */
export function useVisualViewportFrame(
  active: boolean,
  elRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) return
    const el = elRef.current
    const vv = window.visualViewport
    if (!el || !vv) return

    const clear = () => {
      el.style.top = ''
      el.style.left = ''
      el.style.right = ''
      el.style.bottom = ''
      el.style.width = ''
      el.style.height = ''
      el.style.maxHeight = ''
      el.style.minHeight = ''
    }

    const sync = () => {
      const top = Math.max(0, Math.round(vv.offsetTop))
      const height = Math.max(0, Math.round(vv.height))
      el.style.top = `${top}px`
      el.style.left = '0'
      el.style.right = '0'
      el.style.bottom = 'auto'
      el.style.width = '100%'
      el.style.height = `${height}px`
      el.style.maxHeight = `${height}px`
      el.style.minHeight = `${height}px`
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('orientationchange', sync)
      clear()
    }
  }, [active, elRef])
}

'use client'

import { useEffect } from 'react'

/**
 * Spec §14: Tastatur offen → `body.kb-open` (Sticky Bottom-Nav / FAB / CTA ausblenden).
 * Nutzt visualViewport-Höhe vs. Layout-Viewport.
 */
export function useKeyboardOpen(thresholdPx = 120) {
  useEffect(() => {
    const root = document.body
    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const shrink = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.classList.toggle('kb-open', shrink > thresholdPx)
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('focusin', sync)
    window.addEventListener('focusout', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('focusin', sync)
      window.removeEventListener('focusout', sync)
      root.classList.remove('kb-open')
    }
  }, [thresholdPx])
}

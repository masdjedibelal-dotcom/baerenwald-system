/**
 * Versteckt Bottom-Nav / FAB / Floating-Detail-CTA und friert den Hintergrund-Scroll ein,
 * solange ein Blocking-Overlay offen ist. Refcount — gestapelte Sheets/Modals.
 */
import { acquireBodyScrollLock } from '@/lib/surfaces/body-scroll-lock'

let depth = 0

export function acquireOverlayChromeLock(): () => void {
  if (typeof document === 'undefined') return () => {}
  depth += 1
  document.body.classList.add('has-blocking-overlay')
  document.body.dataset.blockingOverlayCount = String(depth)
  const releaseScroll = acquireBodyScrollLock()
  return () => {
    releaseScroll()
    depth = Math.max(0, depth - 1)
    if (depth === 0) {
      document.body.classList.remove('has-blocking-overlay')
      delete document.body.dataset.blockingOverlayCount
      // Nach Sheet-Close: Nav/CTA/Safe-Area neu an Scroll-Position koppeln
      try {
        window.dispatchEvent(new Event('bw:scroll-chrome-sync'))
      } catch {
        /* ignore */
      }
    } else {
      document.body.dataset.blockingOverlayCount = String(depth)
    }
  }
}

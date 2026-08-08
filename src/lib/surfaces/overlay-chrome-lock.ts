/**
 * Versteckt Bottom-Nav / FAB / Floating-Detail-CTA, solange ein Blocking-Overlay offen ist.
 * Refcount — gestapelte Sheets/Modals bleiben abgedeckt.
 */
let depth = 0

export function acquireOverlayChromeLock(): () => void {
  if (typeof document === 'undefined') return () => {}
  depth += 1
  document.body.classList.add('has-blocking-overlay')
  document.body.dataset.blockingOverlayCount = String(depth)
  return () => {
    depth = Math.max(0, depth - 1)
    if (depth === 0) {
      document.body.classList.remove('has-blocking-overlay')
      delete document.body.dataset.blockingOverlayCount
    } else {
      document.body.dataset.blockingOverlayCount = String(depth)
    }
  }
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Focusables innerhalb von `root` (sichtbar, nicht disabled). */
export function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null
  )
}

function isFocusableElement(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(FOCUSABLE) && !el.hasAttribute('disabled')
}

/**
 * Tab-Taste im Dialog halten + initialen Fokus setzen.
 * Rückgabe: Cleanup (Listener entfernen + Fokus zurückgeben).
 *
 * Wichtig mobil: Bei Re-Init (Parent-Rerender) keinen Fokus klauen, sonst klappt
 * die iOS-Tastatur zu — typisch wenn ein EditorSheet-Portal über dem Canvas liegt.
 */
export function trapFocus(root: HTMLElement, onEscape?: () => void): () => void {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null

  const focusFirst = () => {
    const active = document.activeElement
    // Schon im Root → nicht springen (Re-Init während Tippen)
    if (active instanceof HTMLElement && root.contains(active)) return
    // Fokus liegt sinnvoll außerhalb (z. B. EditorSheet-Portal) → nicht klauen
    if (isFocusableElement(active) && !root.contains(active)) return

    const items = listFocusable(root)
    ;(items[0] ?? root).focus()
  }

  // Nach Paint fokusieren (Portal / Children)
  const t = window.setTimeout(focusFirst, 0)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEscape?.()
      return
    }
    if (e.key !== 'Tab') return
    const active = document.activeElement
    // Fokus außerhalb (Portal-Sheet): Tab-Trap nicht umleiten
    if (active instanceof HTMLElement && !root.contains(active)) return

    const items = listFocusable(root)
    if (items.length === 0) {
      e.preventDefault()
      root.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => {
    window.clearTimeout(t)
    document.removeEventListener('keydown', onKeyDown)
    // Nur zurückgeben, wenn Fokus noch im Root ist (sonst Portal-Input nicht blurren)
    if (
      document.activeElement instanceof HTMLElement &&
      root.contains(document.activeElement)
    ) {
      previouslyFocused?.focus()
    }
  }
}

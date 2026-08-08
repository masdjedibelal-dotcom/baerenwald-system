/** Soft-Keyboard (iOS/Android) schließen — Fokus aus Input/Textarea nehmen. */
export function dismissSoftKeyboard() {
  if (typeof document === 'undefined') return
  const el = document.activeElement
  if (el instanceof HTMLElement && el !== document.body) el.blur()
}

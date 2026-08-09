/**
 * Koordiniert Browser-History für gestapelte EditorSheets.
 * Nur das oberste Sheet reagiert auf Back; programmatisches Schließen
 * darf darunterliegende Sheets nicht schließen oder Dirty-Confirm auslösen.
 */

type SheetEntry = {
  id: string
  onPop: () => void
}

const stack: SheetEntry[] = []
let suppressPop = 0
let listening = false
let fallthroughTimer: ReturnType<typeof setTimeout> | null = null
let fallthroughEl: HTMLDivElement | null = null

/**
 * Nach Sheet-Close: Ghost-Clicks/Touches auf die Zeile darunter blockieren
 * (sonst öffnet sich das Sheet sofort wieder — wirkt wie „lässt sich nicht schließen“).
 *
 * Wichtig: kein `body { pointer-events: none }` — sonst fallen Touches durch den
 * Wizard/Canvas auf Floating-CTAs / Bottom-Nav darunter (z. B. Kunde-Crow öffnet
 * Versand oder Notiz). Stattdessen ein transparenter Vollbild-Blocker ganz oben.
 */
export function guardSheetPointerFallthrough(ms = 320) {
  if (typeof document === 'undefined') return
  if (fallthroughTimer) clearTimeout(fallthroughTimer)

  if (!fallthroughEl) {
    const el = document.createElement('div')
    el.setAttribute('data-sheet-pointer-guard', '')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;touch-action:none;cursor:default;'
    // Capture-Phase: Touch/Click schlucken, bevor darunter etwas reagiert
    const swallow = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    el.addEventListener('pointerdown', swallow, true)
    el.addEventListener('pointerup', swallow, true)
    el.addEventListener('click', swallow, true)
    el.addEventListener('touchstart', swallow, true)
    el.addEventListener('touchend', swallow, true)
    fallthroughEl = el
  }

  if (!fallthroughEl.isConnected) {
    document.body.appendChild(fallthroughEl)
  }

  fallthroughTimer = setTimeout(() => {
    fallthroughTimer = null
    fallthroughEl?.remove()
  }, ms)
}

function onWindowPopState() {
  if (suppressPop > 0) {
    suppressPop -= 1
    return
  }
  const top = stack[stack.length - 1]
  if (!top) return
  top.onPop()
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('popstate', onWindowPopState)
}

/** Anzahl offener EditorSheets (DocumentCanvas darf deren Back nicht stehlen). */
export function editorSheetStackDepth(): number {
  return stack.length
}

/** Sheet öffnen → History-Entry + Stack. */
export function pushEditorSheetHistory(id: string, onPop: () => void) {
  ensureListener()
  stack.push({ id, onPop })
  window.history.pushState({ editorSheet: id }, '')
}

/**
 * Sheet aus Stack nehmen.
 * War es oben und hat noch einen History-Entry → back mit Suppress,
 * damit darunterliegende Sheets nicht „schließen“ interpretieren.
 */
export function releaseEditorSheetHistory(id: string, opts?: { historyStillPushed?: boolean }) {
  const idx = stack.findIndex((e) => e.id === id)
  if (idx === -1) return
  const wasTop = idx === stack.length - 1
  stack.splice(idx, 1)
  if (wasTop && opts?.historyStillPushed) {
    suppressPop += 1
    window.history.back()
  }
}

/** onPop-Handler aktualisieren (z. B. dirty-Ref), ohne neuen History-Entry. */
export function updateEditorSheetHistoryPop(id: string, onPop: () => void) {
  const entry = stack.find((e) => e.id === id)
  if (entry) entry.onPop = onPop
}

/** Dirty + Back: History wieder herstellen, ohne Stack zu ändern. */
export function restoreEditorSheetHistoryAfterDirtyPop(id: string) {
  suppressPop += 1
  window.history.pushState({ editorSheet: id }, '')
}

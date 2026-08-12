/**
 * Hintergrund-Scroll einfrieren (iOS: position:fixed + Scroll-Restore).
 * Refcount — gestapelte Sheets/Modals.
 *
 * Mobil nutzt oft Dokument-Scroll (window), nicht main.page — deshalb
 * Scroll-Y von window lesen/schreiben und page.overflow nur bei echtem Innen-Scroll setzen.
 */

let depth = 0
let savedScrollY = 0
let savedHtmlOverflow = ''
let savedBody = {
  overflow: '',
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
}
let savedPageOverflow = ''
let pageWasScrollContainer = false
let touchMoveBound = false

const SCROLL_ALLOW =
  '[data-scroll-lock-allow], .mobile-filter-sheet__body, .mobile-filter-sheet__panel, .editor-sheet__body, .document-canvas__body, .mock-modal__body, .sheet-body, .sheet-b, .action-sheet__body, .action-busy'

/** Touch darf scrollen, wenn Ziel in Allow-Zone liegt oder ein overflow-Container scrollbar ist. */
function touchMoveAllowed(target: Element): boolean {
  if (target.closest(SCROLL_ALLOW)) return true
  let el: Element | null = target
  while (el && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el)
      const oy = style.overflowY
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1
      ) {
        return true
      }
    }
    el = el.parentElement
  }
  return false
}

function onTouchMove(e: TouchEvent) {
  const t = e.target
  if (!(t instanceof Element)) {
    e.preventDefault()
    return
  }
  if (touchMoveAllowed(t)) return
  e.preventDefault()
}

function bindTouchBlock() {
  if (touchMoveBound) return
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  touchMoveBound = true
}

function unbindTouchBlock() {
  if (!touchMoveBound) return
  document.removeEventListener('touchmove', onTouchMove)
  touchMoveBound = false
}

function readScrollY(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  )
}

function pageIsScrollContainer(page: HTMLElement): boolean {
  const style = window.getComputedStyle(page)
  const oy = style.overflowY
  return (
    (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
    page.scrollHeight > page.clientHeight + 1
  )
}

function syncScrollChrome() {
  try {
    window.dispatchEvent(new Event('bw:scroll-chrome-sync'))
    window.dispatchEvent(new Event('scroll'))
  } catch {
    /* ignore */
  }
}

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined') return () => {}

  depth += 1
  if (depth === 1) {
    const html = document.documentElement
    const body = document.body
    const page = document.querySelector<HTMLElement>('main.page')

    savedScrollY = readScrollY()
    if (page && pageIsScrollContainer(page) && page.scrollTop > savedScrollY) {
      savedScrollY = page.scrollTop
    }
    pageWasScrollContainer = Boolean(page && pageIsScrollContainer(page))

    savedHtmlOverflow = html.style.overflow
    savedBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }
    savedPageOverflow = page?.style.overflow ?? ''

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${savedScrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.classList.add('has-body-scroll-lock')
    if (page && pageWasScrollContainer) {
      page.style.overflow = 'hidden'
    }
    bindTouchBlock()
  }

  return () => {
    depth = Math.max(0, depth - 1)
    if (depth > 0) return

    const html = document.documentElement
    const body = document.body
    const page = document.querySelector<HTMLElement>('main.page')

    unbindTouchBlock()
    html.style.overflow = savedHtmlOverflow
    body.style.overflow = savedBody.overflow
    body.style.position = savedBody.position
    body.style.top = savedBody.top
    body.style.left = savedBody.left
    body.style.right = savedBody.right
    body.style.width = savedBody.width
    body.classList.remove('has-body-scroll-lock')
    if (page && pageWasScrollContainer) {
      page.style.overflow = savedPageOverflow
    }

    const y = savedScrollY
    // Nach position:fixed: Scroll + Chrome (Nav/CTA/Safe-Area) im nächsten Frame syncen
    window.requestAnimationFrame(() => {
      window.scrollTo(0, y)
      if (page && pageWasScrollContainer) {
        page.scrollTop = y
      }
      syncScrollChrome()
      // iOS: zweiter Pass nach Layout/Safe-Area
      window.requestAnimationFrame(() => {
        window.scrollTo(0, y)
        syncScrollChrome()
      })
    })
  }
}

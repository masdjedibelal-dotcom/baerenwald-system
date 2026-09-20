/**
 * DocumentCanvas-Chrome: Gliederung, Prüfliste, Zuletzt-gespeichert.
 * Kanon für alle Dokument-Wizards (AG/RE/Abnahme/Staff/Verträge/Direkt/Abschluss).
 */

export type DocCanvasSection = {
  id: string
  label: string
  /** true = Haken „vollständig“ */
  complete: boolean
}

export type DocCanvasGap = {
  id: string
  /** Kurzlabel in „Bitte noch ergänzen: …“ */
  label: string
}

export type DocCanvasPrimaryAction = {
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  /**
   * Lücken vor dem Ausführen. Nicht-leer → Prüfliste mit Sprung, kein onClick.
   */
  getGaps?: () => DocCanvasGap[]
}

export type DocCanvasDraftAction = {
  label?: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
}

/** „Zuletzt gespeichert vor X Min.“ — null wenn noch nie. */
export function formatLastSavedAt(
  at: number | Date | null | undefined,
  now = Date.now()
): string | null {
  if (at == null) return null
  const ms = typeof at === 'number' ? at : at.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const mins = Math.max(0, Math.floor((now - ms) / 60_000))
  if (mins < 1) return 'Zuletzt gespeichert gerade eben'
  if (mins === 1) return 'Zuletzt gespeichert vor 1 Min.'
  return `Zuletzt gespeichert vor ${mins} Min.`
}

export function formatChecklistLead(gaps: DocCanvasGap[]): string {
  const labels = gaps.map((g) => g.label.trim()).filter(Boolean)
  if (!labels.length) return ''
  return `Bitte noch ergänzen: ${labels.join(', ')}`
}

/** Scroll + optional Klick auf `[data-doc-section="id"]` im Canvas. */
export function jumpToDocSection(
  root: HTMLElement | null | undefined,
  sectionId: string
): void {
  if (!root || !sectionId) return
  const el = root.querySelector(
    `[data-doc-section="${CSS.escape(sectionId)}"]`
  ) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const clickable =
    el.closest('button') ??
    (el.matches('button, a, [role="button"]') ? el : null) ??
    el.querySelector('button, a, [role="button"]')
  if (clickable instanceof HTMLElement) {
    window.setTimeout(() => clickable.click(), 280)
  }
}

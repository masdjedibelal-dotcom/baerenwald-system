'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type ResizableColDef = {
  id: string
  /** Startbreite in px */
  defaultWidth: number
  minWidth?: number
  maxWidth?: number
  /** Nicht ziehbar (Checkbox, Menü, …) */
  fixed?: boolean
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function loadWidths(key: string, defs: ResizableColDef[]): number[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, number>
    if (!parsed || typeof parsed !== 'object') return null
    return defs.map((d) => {
      const v = parsed[d.id]
      if (typeof v !== 'number' || !Number.isFinite(v)) return d.defaultWidth
      return clamp(v, d.minWidth ?? 48, d.maxWidth ?? 640)
    })
  } catch {
    return null
  }
}

function saveWidths(key: string, defs: ResizableColDef[], widths: number[]) {
  try {
    const obj: Record<string, number> = {}
    defs.forEach((d, i) => {
      obj[d.id] = widths[i] ?? d.defaultWidth
    })
    localStorage.setItem(key, JSON.stringify(obj))
  } catch {
    /* ignore */
  }
}

/**
 * Desktop-Listen: Spaltenbreiten speichern + per Drag anpassen.
 * Flexible Spalten als `minmax(0, Nfr)` (füllen die Breite), fixe als px.
 */
export function useResizableColumns(storageKey: string, defs: ResizableColDef[]) {
  const defsKey = defs.map((d) => d.id).join('|')
  const [widths, setWidths] = useState<number[]>(() => defs.map((d) => d.defaultWidth))
  const dragRef = useRef<{
    index: number
    startX: number
    startW: number
  } | null>(null)

  useEffect(() => {
    const loaded = loadWidths(storageKey, defs)
    if (loaded) setWidths(loaded)
    else setWidths(defs.map((d) => d.defaultWidth))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defs via defsKey
  }, [storageKey, defsKey])

  const gridTemplateColumns = useMemo(
    () =>
      widths
        .map((w, i) => {
          const d = defs[i]
          const rounded = Math.max(1, Math.round(w))
          if (d?.fixed) return `${rounded}px`
          /* fr-Gewichte: Zeile füllt die Breite, kein Horizontal-Scroll */
          return `minmax(0, ${rounded}fr)`
        })
        .join(' '),
    [widths, defs]
  )

  const startResize = useCallback(
    (index: number, e: ReactPointerEvent) => {
      const def = defs[index]
      if (!def || def.fixed) return
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startW = widths[index] ?? def.defaultWidth
      dragRef.current = { index, startX, startW }
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture?.(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag) return
        const d = defs[drag.index]
        if (!d) return
        const next = clamp(
          drag.startW + (ev.clientX - drag.startX),
          d.minWidth ?? 48,
          d.maxWidth ?? 640
        )
        setWidths((prev) => {
          const copy = [...prev]
          copy[drag.index] = next
          return copy
        })
      }

      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        dragRef.current = null
        setWidths((prev) => {
          saveWidths(storageKey, defs, prev)
          return prev
        })
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [defs, storageKey, widths]
  )

  const reset = useCallback(() => {
    const next = defs.map((d) => d.defaultWidth)
    setWidths(next)
    saveWidths(storageKey, defs, next)
  }, [defs, storageKey])

  return { widths, gridTemplateColumns, startResize, reset }
}

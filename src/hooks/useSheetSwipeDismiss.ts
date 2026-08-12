'use client'

import { useCallback, useRef, useState, type CSSProperties, type PointerEventHandler } from 'react'

export const SHEET_SWIPE_DISMISS_PX = 80

type DragState = {
  startY: number
  pointerId: number
}

/**
 * Swipe-down zum Schließen von Bottom Sheets (Overlays).
 * Nur nach unten ziehen; unter Schwelle → Transform zurücksetzen.
 */
export function useSheetSwipeDismiss(options: {
  onDismiss: () => void
  /** z. B. nested Confirm offen */
  blocked?: boolean
}) {
  const { onDismiss, blocked = false } = options
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  const resetDrag = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
    setDragY(0)
  }, [])

const INTERACTIVE_DRAG_SKIP = 'button, a, input, textarea, select, [role="button"], [contenteditable="true"]'

  const onPointerDown: PointerEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (blocked) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest(INTERACTIVE_DRAG_SKIP)) return
      dragRef.current = { startY: e.clientY, pointerId: e.pointerId }
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [blocked]
  )

  const onPointerMove: PointerEventHandler<HTMLElement> = useCallback((e) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const delta = e.clientY - drag.startY
    setDragY(delta > 0 ? delta : 0)
  }, [])

  const onPointerUp: PointerEventHandler<HTMLElement> = useCallback(
    (e) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      const delta = e.clientY - drag.startY
      dragRef.current = null
      setIsDragging(false)
      if (delta > SHEET_SWIPE_DISMISS_PX) {
        setDragY(0)
        onDismiss()
        return
      }
      setDragY(0)
    },
    [onDismiss]
  )

  const onPointerCancel: PointerEventHandler<HTMLElement> = useCallback(
    (e) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      resetDrag()
    },
    [resetDrag]
  )

  const dragZoneProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    style: { touchAction: 'none' as const },
  }

  const sheetMotionStyle: CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.22s ease-out',
    willChange: isDragging ? 'transform' : undefined,
  }

  return { dragZoneProps, sheetMotionStyle, dragY, isDragging }
}

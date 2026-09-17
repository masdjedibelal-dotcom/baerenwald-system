'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  onChange: (hasSignature: boolean, dataUrl: string | null) => void
  className?: string
  /** Bestehende Signatur (Data-URL) — Anzeige bis neu gezeichnet / gelöscht. */
  initialDataUrl?: string | null
  large?: boolean
}

/** Canvas-Unterschrift für CRM (Abnahme u. a.). */
export function SignatureCanvas({
  onChange,
  className,
  initialDataUrl = null,
  large = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [hasSig, setHasSig] = useState(() => Boolean(initialDataUrl?.trim()))
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => initialDataUrl?.trim() || null
  )

  const height = large ? 180 : 140

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || previewUrl) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1c211e'

    function pos(e: MouseEvent | TouchEvent) {
      const r = cv!.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY
      return {
        x: (clientX - r.left) * (cv!.width / r.width),
        y: (clientY - r.top) * (cv!.height / r.height),
      }
    }

    function emit() {
      onChangeRef.current(true, cv!.toDataURL('image/png'))
    }

    function start(e: MouseEvent | TouchEvent) {
      drawingRef.current = true
      const p = pos(e)
      ctx!.beginPath()
      ctx!.moveTo(p.x, p.y)
      e.preventDefault()
    }

    function move(e: MouseEvent | TouchEvent) {
      if (!drawingRef.current) return
      const p = pos(e)
      ctx!.lineTo(p.x, p.y)
      ctx!.stroke()
      setHasSig(true)
      emit()
      e.preventDefault()
    }

    function end() {
      drawingRef.current = false
    }

    cv.addEventListener('mousedown', start)
    cv.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    cv.addEventListener('touchstart', start, { passive: false })
    cv.addEventListener('touchmove', move, { passive: false })
    cv.addEventListener('touchend', end)

    return () => {
      cv.removeEventListener('mousedown', start)
      cv.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      cv.removeEventListener('touchstart', start)
      cv.removeEventListener('touchmove', move)
      cv.removeEventListener('touchend', end)
    }
  }, [height, previewUrl])

  function clear() {
    const cv = canvasRef.current
    if (cv) {
      const ctx = cv.getContext('2d')
      ctx?.clearRect(0, 0, cv.width, cv.height)
    }
    setPreviewUrl(null)
    setHasSig(false)
    onChangeRef.current(false, null)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative overflow-hidden rounded-lg border border-dashed border-bw-border bg-white">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Unterschrift"
            className="block w-full object-contain"
            style={{ minHeight: height, maxHeight: height + 40 }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={640}
            height={height}
            className="block w-full touch-none"
            style={{ minHeight: height }}
            aria-label="Unterschriftsfeld — mit Maus oder Finger zeichnen"
          />
        )}
        {!hasSig && !previewUrl ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            Hier mit Finger oder Stift unterschreiben
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-[length:var(--fs-meta)] text-bw-text-muted underline"
      >
        Unterschrift löschen
      </button>
    </div>
  )
}

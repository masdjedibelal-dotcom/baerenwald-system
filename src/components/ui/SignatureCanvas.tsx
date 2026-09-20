'use client'

import { MockBtn } from '@/components/mock-ui'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/** Pad-Hintergrund (weiß) — PDF braucht opakes Weiß, nicht transparent. */
const PAD_BG = '#ffffff'
/** Strichfarbe — nur die Unterschrift schwarz. */
const PAD_INK = '#000000'

type Props = {
  onChange: (hasSignature: boolean, dataUrl: string | null) => void
  className?: string
  /** Bestehende Signatur (Data-URL) — Anzeige bis neu gezeichnet / gelöscht. */
  initialDataUrl?: string | null
  large?: boolean
  /**
   * Querformat (wie Post-App): Pad füllt ein großes Overlay-Sheet.
   * Portrait zeigt kompaktes Feld + Hinweis zum Drehen.
   */
  expandOnLandscape?: boolean
}

function useLandscape(enabled: boolean) {
  const [landscape, setLandscape] = useState(false)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const mq = window.matchMedia('(orientation: landscape)')
    const sync = () => setLandscape(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [enabled])
  return enabled && landscape
}

/** Canvas-Unterschrift für CRM (Abnahme u. a.). */
export function SignatureCanvas({
  onChange,
  className,
  initialDataUrl = null,
  large = true,
  expandOnLandscape = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [hasSig, setHasSig] = useState(() => Boolean(initialDataUrl?.trim()))
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => initialDataUrl?.trim() || null
  )
  const [mounted, setMounted] = useState(false)
  const landscape = useLandscape(expandOnLandscape)

  useEffect(() => setMounted(true), [])

  // Beim Wechsel in Querformat: aktuelle Signatur aus Props als Preview übernehmen
  // (Canvas remountet sonst leer).
  useEffect(() => {
    if (!landscape) return
    const next = initialDataUrl?.trim() || null
    if (next) {
      setPreviewUrl(next)
      setHasSig(true)
    }
  }, [landscape, initialDataUrl])

  const compactHeight = large ? 180 : 140

  useEffect(() => {
    const cv = canvasRef.current
    const wrap = wrapRef.current
    if (!cv || previewUrl) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    function applyStrokeStyle() {
      ctx!.lineWidth = landscape ? 2.8 : 2.2
      ctx!.lineCap = 'round'
      ctx!.lineJoin = 'round'
      ctx!.strokeStyle = PAD_INK
    }

    function sizeCanvas() {
      const el = wrapRef.current
      if (!el || !cv) return
      const w = Math.max(1, Math.floor(el.clientWidth))
      const h = landscape
        ? Math.max(1, Math.floor(el.clientHeight))
        : compactHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const nextW = Math.floor(w * dpr)
      const nextH = Math.floor(h * dpr)
      if (cv.width === nextW && cv.height === nextH) {
        applyStrokeStyle()
        return
      }
      let backup: HTMLCanvasElement | null = null
      if (cv.width > 0 && cv.height > 0) {
        backup = document.createElement('canvas')
        backup.width = cv.width
        backup.height = cv.height
        backup.getContext('2d')?.drawImage(cv, 0, 0)
      }
      cv.width = nextW
      cv.height = nextH
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      // width/height-Reset → Bitmap transparent-schwarz; explizit weiß füllen
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.fillStyle = PAD_BG
      ctx!.fillRect(0, 0, nextW, nextH)
      if (backup) {
        ctx!.drawImage(backup, 0, 0, nextW, nextH)
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      applyStrokeStyle()
    }

    sizeCanvas()

    const ro =
      typeof ResizeObserver !== 'undefined' && wrap
        ? new ResizeObserver(() => sizeCanvas())
        : null
    if (wrap && ro) ro.observe(wrap)

    function pos(e: MouseEvent | TouchEvent) {
      const r = cv!.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY
      return {
        x: clientX - r.left,
        y: clientY - r.top,
      }
    }

    function emit() {
      onChangeRef.current(true, cv!.toDataURL('image/png'))
    }

    function start(e: MouseEvent | TouchEvent) {
      drawingRef.current = true
      applyStrokeStyle()
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
      setPreviewUrl(null)
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
      ro?.disconnect()
      cv.removeEventListener('mousedown', start)
      cv.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      cv.removeEventListener('touchstart', start)
      cv.removeEventListener('touchmove', move)
      cv.removeEventListener('touchend', end)
    }
  }, [compactHeight, previewUrl, landscape])

  function clear() {
    const cv = canvasRef.current
    if (cv) {
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = PAD_BG
        ctx.fillRect(0, 0, cv.width, cv.height)
        ctx.restore()
      }
    }
    setPreviewUrl(null)
    setHasSig(false)
    onChangeRef.current(false, null)
  }

  const padBody = (
    <div
      ref={wrapRef}
      className={cn(
        'relative overflow-hidden signature-pad-stage',
        landscape
          ? 'signature-pad-sheet__stage'
          : 'rounded-card border border-dashed border-bw-border'
      )}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Unterschrift"
          className={cn(
            'block w-full object-contain signature-pad-stage__img',
            landscape ? 'h-full' : undefined
          )}
          style={
            landscape
              ? undefined
              : { minHeight: compactHeight, maxHeight: compactHeight + 40 }
          }
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="block w-full touch-none signature-pad-stage__canvas"
          style={landscape ? { height: '100%' } : { minHeight: compactHeight }}
          aria-label="Unterschriftsfeld — mit Maus oder Finger zeichnen"
        />
      )}
      {!hasSig && !previewUrl ? (
        <p
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-bw-text-muted',
            landscape
              ? 'text-[length:var(--fs-title)]'
              : 'text-[length:var(--fs-text)]'
          )}
        >
          Hier mit Finger oder Stift unterschreiben
        </p>
      ) : null}
    </div>
  )

  if (landscape && mounted) {
    return (
      <>
        <div className={cn('signature-pad-compact-placeholder space-y-1.5', className)}>
          <p className="rounded-card border border-dashed border-bw-border bg-bw-bg-soft px-3 py-6 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            Querformat — großes Unterschriftsfeld geöffnet
          </p>
        </div>
        {createPortal(
          <div className="signature-pad-sheet" role="dialog" aria-modal="true" aria-label="Unterschrift">
            <header className="signature-pad-sheet__bar">
              <p className="signature-pad-sheet__hint m-0">Unterschrift</p>
              <div className="signature-pad-sheet__actions">
                <MockBtn type="button" kind="ghost" onClick={clear}>
                  Löschen
                </MockBtn>
              </div>
            </header>
            {padBody}
            <p className="signature-pad-sheet__footer m-0">
              Gerät hochkant halten zum Weiterbearbeiten
            </p>
          </div>,
          document.body
        )}
      </>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {padBody}
      {expandOnLandscape ? (
        <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
          Gerät quer halten für großes Unterschriftsfeld
        </p>
      ) : null}
      <MockBtn
        className="text-[length:var(--fs-meta)] text-bw-text-muted underline"
        type="button"
        onClick={clear}
      >
        Unterschrift löschen
      </MockBtn>
    </div>
  )
}

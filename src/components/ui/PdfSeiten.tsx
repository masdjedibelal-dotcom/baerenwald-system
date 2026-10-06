'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * PDF-Vorschau, die die Seiten selbst zeichnet (pdf.js über unpdf) — statt <iframe>.
 * Grund: Browser ohne eingebauten PDF-Betrachter (iPhone im Rahmen, App-Ansichten) laden
 * die Datei sonst herunter, statt sie zu zeigen. pdf.js wird erst beim Öffnen geladen.
 */
export function PdfSeiten({ url, className }: { url: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [stand, setStand] = useState<'laden' | 'fertig' | 'fehler'>('laden')

  useEffect(() => {
    const box = boxRef.current
    if (!box || !url) return
    let abgebrochen = false
    setStand('laden')
    box.replaceChildren()
    void (async () => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`PDF ${res.status}`)
        const daten = new Uint8Array(await res.arrayBuffer())
        const { getDocumentProxy } = await import('unpdf')
        const pdf = await getDocumentProxy(daten)
        const breite = Math.max(280, box.clientWidth || 800)
        const dichte = Math.min(2, window.devicePixelRatio || 1)
        for (let nr = 1; nr <= pdf.numPages && !abgebrochen; nr += 1) {
          const seite = await pdf.getPage(nr)
          const basis = seite.getViewport({ scale: 1 })
          const viewport = seite.getViewport({ scale: (breite / basis.width) * dichte })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'pdf-seite'
          canvas.setAttribute('aria-label', `Seite ${nr} von ${pdf.numPages}`)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Canvas nicht verfügbar')
          await seite.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof seite.render>[0]).promise
          if (!abgebrochen) box.appendChild(canvas)
        }
        if (!abgebrochen) setStand('fertig')
      } catch (e) {
        console.error('[PdfSeiten]', e)
        if (!abgebrochen) setStand('fehler')
      }
    })()
    return () => {
      abgebrochen = true
    }
  }, [url])

  return (
    <div className={className}>
      {stand === 'laden' ? <p className="pdf-seiten__hinweis">PDF wird geladen …</p> : null}
      {stand === 'fehler' ? (
        <p className="pdf-seiten__hinweis">
          Vorschau konnte nicht geladen werden.{' '}
          <a href={url} target="_blank" rel="noreferrer">
            PDF öffnen
          </a>
        </p>
      ) : null}
      <div ref={boxRef} className="pdf-seiten" />
    </div>
  )
}

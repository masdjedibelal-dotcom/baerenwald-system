/**
 * Puppeteer `page.evaluate`-Callback: eingebettete Fotos vor printToPDF
 * als JPEG verkleinern — kleinere PDFs / Mail-Anhänge, ohne Extra-Dependency.
 *
 * Läuft im Browser-Kontext (Canvas). Fehler pro Bild werden still ignoriert.
 */
export type CompressPageImagesOpts = {
  /** Längste Kante in px (default 960 — für A4-Druck ausreichend). */
  maxEdge?: number
  /** JPEG-Qualität 0–1 (default 0.72). */
  quality?: number
}

export async function compressPageImagesForPdf(
  this: void,
  opts: CompressPageImagesOpts = {}
): Promise<number> {
  const maxEdge = opts.maxEdge ?? 960
  const quality = opts.quality ?? 0.72
  let compressed = 0

  const imgs = Array.from(document.images)
  for (const img of imgs) {
    try {
      if (!img.naturalWidth || !img.naturalHeight) continue
      // Schon winzig (Icons/Checks) — überspringen
      if (img.naturalWidth <= 48 && img.naturalHeight <= 48) continue

      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))

      // Nur neu kodieren wenn Verkleinerung oder große Display-Fläche
      const needsShrink = scale < 0.999 || img.naturalWidth * img.naturalHeight > 400_000
      if (!needsShrink && (img.src.startsWith('data:image/jpeg') || img.src.startsWith('data:image/jpg'))) {
        continue
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (!dataUrl.startsWith('data:image/jpeg')) continue

      await new Promise<void>((resolve) => {
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
        img.src = dataUrl
        if (img.complete) resolve()
        else setTimeout(resolve, 3_000)
      })
      compressed += 1
    } catch {
      /* einzelnes Bild — PDF trotzdem erzeugen */
    }
  }
  return compressed
}

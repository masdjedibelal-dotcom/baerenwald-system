/**
 * Client-seitige Foto-Optimierung vor Upload (Canvas).
 * Kein Größen-Toast — große iPhone-Bilder werden still verkleinert.
 */

const DEFAULT_MAX_EDGE = 2048
/** Zielgröße nach Optimierung — schnell genug für Function-/Storage-Upload. */
const DEFAULT_MAX_BYTES = 2.5 * 1024 * 1024
const QUALITIES = [0.82, 0.72, 0.62, 0.52] as const

function isProbablyImage(file: File): boolean {
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)
}

function jpegFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'foto'
  return `${base}.jpg`
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* Fallback Image() — z. B. HEIC je nach Browser */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
      el.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG-Export fehlgeschlagen'))),
      'image/jpeg',
      quality
    )
  })
}

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number
): HTMLCanvasElement {
  const sw =
    'naturalWidth' in source && source.naturalWidth
      ? source.naturalWidth
      : source.width
  const sh =
    'naturalHeight' in source && source.naturalHeight
      ? source.naturalHeight
      : source.height
  const scale = Math.min(1, maxEdge / Math.max(sw, sh, 1))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')
  ctx.drawImage(source, 0, 0, w, h)
  return canvas
}

/**
 * Verkleinert/komprimiert ein Foto für Upload.
 * Bei nicht dekodierbaren Formaten (selten HEIC in manchen Browsern): Original zurück.
 */
export async function optimizeImageForUpload(
  file: File,
  opts?: { maxEdge?: number; maxBytes?: number }
): Promise<File> {
  if (!isProbablyImage(file)) return file

  const maxEdge = opts?.maxEdge ?? DEFAULT_MAX_EDGE
  const maxBytes = opts?.maxBytes ?? DEFAULT_MAX_BYTES

  // Schon klein genug und JPEG/WebP — unverändert lassen
  const type = (file.type || '').toLowerCase()
  if (
    file.size <= maxBytes &&
    (type === 'image/jpeg' || type === 'image/webp' || type === 'image/jpg')
  ) {
    return file
  }

  let bitmap: ImageBitmap | HTMLImageElement
  try {
    bitmap = await loadBitmap(file)
  } catch {
    return file
  }

  try {
    let edge = maxEdge
    for (let round = 0; round < 3; round++) {
      const canvas = drawScaled(bitmap, edge)
      for (const q of QUALITIES) {
        const blob = await canvasToJpegBlob(canvas, q)
        if (blob.size <= maxBytes) {
          return new File([blob], jpegFileName(file.name), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
        }
      }
      edge = Math.round(edge * 0.75)
    }
    // Letzter Versuch: stärkste Kompression bei kleinem Edge
    const canvas = drawScaled(bitmap, Math.min(edge, 1280))
    const blob = await canvasToJpegBlob(canvas, 0.45)
    return new File([blob], jpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) {
      bitmap.close()
    }
  }
}

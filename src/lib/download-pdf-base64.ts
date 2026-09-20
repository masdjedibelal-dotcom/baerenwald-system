/** Blob-URL für In-App-Vorschau (Caller muss revoke). */
export function pdfBlobUrlFromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

/** Leeren Tab synchron im User-Gesture öffnen (Mobil blockiert sonst nach await). */
export function openPreviewTab(): Window | null {
  try {
    return window.open('about:blank', '_blank')
  } catch {
    return null
  }
}

/** PDF in neuem Tab öffnen (Vorschau ohne Download). */
export function openPdfFromBase64(base64: string, target?: Window | null) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  let opened = false
  if (target && !target.closed) {
    try {
      target.location.href = url
      opened = true
    } catch {
      try {
        target.close()
      } catch {
        /* ignore */
      }
    }
  }
  if (!opened) {
    try {
      opened = Boolean(window.open(url, '_blank'))
    } catch {
      opened = false
    }
  }
  if (!opened) {
    // Letzter Fallback (iOS / strikte Popup-Blocker): Download anstoßen
    const a = document.createElement('a')
    a.href = url
    a.download = 'vorschau.pdf'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

/** Client-seitiger Download aus Server-Action base64 */
export function downloadPdfFromBase64(base64: string, filename: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

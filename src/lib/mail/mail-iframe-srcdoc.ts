/** Vorschau-Iframe: immer heller weißer Hintergrund (wie Bautagebuch / Abschlussdoku). */
export function mailIframeSrcDoc(
  html: string,
  loadingMessage = 'Vorschau lädt…'
): string {
  const trimmed = html.trim()
  if (trimmed && /<html[\s>]/i.test(trimmed)) return trimmed
  const inner =
    trimmed ||
    `<p style="margin:0;padding:12px;color:#6B7280;font-family:Arial,Helvetica,sans-serif;">${loadingMessage}</p>`
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head><body style="margin:0;padding:0;background-color:#ffffff !important;background:#ffffff;">${inner}</body></html>`
}

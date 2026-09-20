/**
 * HTML → Plain-Text für Resend `text` (Multipart).
 * Kein DOM — Node-sicher, genug für Transaktionsmails.
 */

export function htmlToPlainText(html: string): string {
  if (!html?.trim()) return ''
  let s = html
  // Preheader / hidden
  s = s.replace(/<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  // Block-Umbrüche
  s = s.replace(/<\s*br\s*\/?>/gi, '\n')
  s = s.replace(/<\/\s*(p|div|tr|h[1-6]|li|table)\s*>/gi, '\n')
  s = s.replace(/<\s*li[^>]*>/gi, '• ')
  // Links: Text (URL)
  s = s.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, inner: string) => {
      const label = stripTags(inner).trim()
      const url = href.trim()
      if (!label || label === url) return url
      return `${label} (${url})`
    }
  )
  s = stripTags(s)
  s = decodeEntities(s)
  s = s
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return s
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)))
}

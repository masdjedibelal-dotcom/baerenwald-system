/** Rich-Text: HTML im CRM speichern, sicher anzeigen & in PDFs einbinden. */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'div',
  'span',
])

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value)
}

/** Plain-Text oder HTML → Inhalt für contentEditable. */
export function normalizeEditorHtml(value: string | null | undefined): string {
  const v = value ?? ''
  if (!v.trim()) return ''
  if (looksLikeHtml(v)) return v
  const paras = v.split(/\n\n+/)
  if (paras.length <= 1) {
    return escapeHtml(v).replace(/\n/g, '<br>')
  }
  return paras
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Editor-HTML → kompaktes HTML zum Speichern (leere Blöcke entfernen). */
export function serializeEditorHtml(html: string): string {
  const t = html
    .replace(/<div><br><\/div>/gi, '')
    .replace(/<p><br><\/p>/gi, '')
    .replace(/<br\s*\/?>\s*$/gi, '')
    .trim()
  if (!t || t === '<br>') return ''
  return t
}

function stripTagAttributes(html: string): string {
  return html.replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, (full, tag: string) => {
    if (!ALLOWED_TAGS.has(tag.toLowerCase())) return full
    return `<${tag.toLowerCase()}>`
  })
}

function stripDisallowedTags(html: string): string {
  if (typeof document === 'undefined') {
    return stripTagAttributes(
      html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (full, tag: string) =>
        ALLOWED_TAGS.has(tag.toLowerCase()) ? full : ''
      )
    )
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        const tag = el.tagName.toLowerCase()
        if (!ALLOWED_TAGS.has(tag)) {
          const text = doc.createTextNode(el.textContent ?? '')
          el.replaceWith(text)
        } else {
          Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name))
          walk(el)
        }
      }
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

/** HTML für UI-Anzeige (Notizen, Detail). */
export function sanitizeRichTextHtml(html: string | null | undefined): string {
  const raw = (html ?? '').trim()
  if (!raw) return ''
  if (!looksLikeHtml(raw)) {
    return escapeHtml(raw).replace(/\n/g, '<br>')
  }
  return stripDisallowedTags(raw)
}

/** Plain-Text (auch mit eingebettetem HTML) → sicheres PDF-HTML mit Absätzen/Zeilenumbrüchen. */
export function plainTextToPdfHtml(text: string | null | undefined): string {
  const plain = richTextToPlain(text).trim()
  if (!plain) return ''
  const paras = plain.split(/\n\n+/)
  if (paras.length <= 1) {
    return escapeHtml(plain).replace(/\n/g, '<br/>')
  }
  return paras
    .map((p) => `<p style="margin:0 0 8px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

/** Plain oder Rich → sicheres HTML für Angebots-PDF (ohne esc()). */
export function richTextToSafePdfHtml(text: string | null | undefined): string {
  const raw = (text ?? '').trim()
  if (!raw) return ''
  if (!looksLikeHtml(raw)) {
    return escapeHtml(raw).replace(/\n/g, '<br/>')
  }
  let safe = stripDisallowedTags(raw)
  safe = safe
    .replace(/<p>/gi, '<p style="margin:0 0 8px;">')
    .replace(/<ul>/gi, '<ul style="margin:8px 0;padding-left:20px;">')
    .replace(/<ol>/gi, '<ol style="margin:8px 0;padding-left:20px;">')
    .replace(/<li>/gi, '<li style="margin:2px 0;">')
  return safe
}

/** Plain-Text für Vorschau / Suche. */
export function richTextToPlain(html: string | null | undefined): string {
  const raw = (html ?? '').trim()
  if (!raw) return ''
  if (!looksLikeHtml(raw)) return raw
  if (typeof document === 'undefined') {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
}

/** HTML oder Plain-Text → einzelne Checklisten-Zeilen (Listen, Absätze, Zeilenumbrüche). */
export function richTextToChecklistLines(html: string | null | undefined): string[] {
  const raw = (html ?? '').trim()
  if (!raw) return []

  if (!looksLikeHtml(raw)) {
    return raw
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((t) => t.length > 0)
  }

  if (typeof document !== 'undefined') {
    const doc = new DOMParser().parseFromString(raw, 'text/html')
    const lines: string[] = []
    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tag = el.tagName.toLowerCase()
        if (tag === 'li') {
          const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
          if (t) lines.push(t)
          return
        }
        if (tag === 'br') {
          lines.push('')
        }
      }
      node.childNodes.forEach(walk)
    }
    walk(doc.body)
    if (lines.length === 0) {
      const plain = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
      return plain ? [plain] : []
    }
    return lines
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((t) => t.length > 0)
  }

  const normalized = decodeBasicEntities(
    raw
      .replace(/<\/li>\s*/gi, '\n')
      .replace(/<li[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*/gi, '\n')
      .replace(/<\/div>\s*/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
  return normalized
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((t) => t.length > 0)
}

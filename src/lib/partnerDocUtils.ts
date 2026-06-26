/** Storage-Bucket für Partner-/Handwerker-Compliance-Dokumente (privat). */
export const PARTNER_DOCS_BUCKET = 'partner-dokumente'

/** Öffentlicher Bucket für Vertrags-PDFs (Rahmen-/Projektvertrag). */
export const VERTRAEGE_PDFS_BUCKET = 'vertraege-pdfs'

export type StoredDocumentRef = { bucket: string; path: string }

const SUPABASE_OBJECT_URL_RE =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i

function normalizeStoragePath(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      try {
        return decodeURIComponent(seg)
      } catch {
        return seg
      }
    })
    .join('/')
}

/**
 * Relativer Pfad, Legacy-URL oder Supabase-Storage-URL → Bucket + Pfad.
 * Abgelaufene sign-URLs werden so in frische Links umgewandelt.
 */
export function parseStoredDocumentRef(
  datei_url: string | null | undefined
): StoredDocumentRef | null {
  if (!datei_url?.trim()) return null
  const s = datei_url.trim()

  const urlMatch = s.match(SUPABASE_OBJECT_URL_RE)
  if (urlMatch?.[1] && urlMatch?.[2]) {
    return {
      bucket: decodeURIComponent(urlMatch[1]),
      path: normalizeStoragePath(urlMatch[2]),
    }
  }

  if (!/^https?:\/\//i.test(s)) {
    let path = s.replace(/^\/+/, '')
    let bucket = PARTNER_DOCS_BUCKET
    if (path.startsWith(`${VERTRAEGE_PDFS_BUCKET}/`)) {
      bucket = VERTRAEGE_PDFS_BUCKET
      path = path.slice(VERTRAEGE_PDFS_BUCKET.length + 1)
    } else if (path.startsWith(`${PARTNER_DOCS_BUCKET}/`)) {
      path = path.slice(PARTNER_DOCS_BUCKET.length + 1)
    }
    path = normalizeStoragePath(path)
    return path ? { bucket, path } : null
  }

  return null
}

/** Relativer Storage-Pfad oder Legacy-URL → Pfad im Bucket partner-dokumente */
export function partnerDokumentStoragePath(datei_url: string | null | undefined): string | null {
  const ref = parseStoredDocumentRef(datei_url)
  if (!ref || ref.bucket !== PARTNER_DOCS_BUCKET) return null
  return ref.path
}

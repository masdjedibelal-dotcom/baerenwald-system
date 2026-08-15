/** Storage-Bucket für CRM-Compliance-Uploads (privat). */
export const PARTNER_DOCS_BUCKET = 'partner-dokumente'

/**
 * Portal-Uploads (Compliance, Fachdoku, Bautagebuch, …) — privater Bucket.
 * CRM hat lange nur in partner-dokumente gesucht → „Datei nicht gefunden“.
 */
export const HANDWERKER_UPLOADS_BUCKET = 'handwerker-uploads'

/** Öffentlicher Bucket für Vertrags-PDFs (Rahmen-/Projektvertrag). */
export const VERTRAEGE_PDFS_BUCKET = 'vertraege-pdfs'

export type StoredDocumentRef = { bucket: string; path: string }

const SUPABASE_OBJECT_URL_RE =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i

/** Relativpfade aus dem Portal liegen unter handwerker-uploads. */
const PORTAL_PATH_HINT =
  /\/(compliance|angebote|bautagebuch|fachdoku|position-eintraege|auftraege|firma)\//i

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

function guessBucketForRelativePath(path: string): string {
  if (path.startsWith(`${HANDWERKER_UPLOADS_BUCKET}/`)) return HANDWERKER_UPLOADS_BUCKET
  if (path.startsWith(`${PARTNER_DOCS_BUCKET}/`)) return PARTNER_DOCS_BUCKET
  if (path.startsWith(`${VERTRAEGE_PDFS_BUCKET}/`)) return VERTRAEGE_PDFS_BUCKET
  if (PORTAL_PATH_HINT.test(`/${path}`)) return HANDWERKER_UPLOADS_BUCKET
  return PARTNER_DOCS_BUCKET
}

function stripBucketPrefix(path: string, bucket: string): string {
  if (path.startsWith(`${bucket}/`)) return path.slice(bucket.length + 1)
  return path
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
    const bucket = guessBucketForRelativePath(path)
    path = stripBucketPrefix(path, bucket)
    path = normalizeStoragePath(path)
    return path ? { bucket, path } : null
  }

  return null
}

/** Alternativ-Bucket, falls Signieren im vermuteten Bucket fehlschlägt. */
export function alternatePartnerDocBucket(bucket: string): string | null {
  if (bucket === PARTNER_DOCS_BUCKET) return HANDWERKER_UPLOADS_BUCKET
  if (bucket === HANDWERKER_UPLOADS_BUCKET) return PARTNER_DOCS_BUCKET
  return null
}

/** Relativer Storage-Pfad im CRM-Bucket partner-dokumente (Legacy). */
export function partnerDokumentStoragePath(datei_url: string | null | undefined): string | null {
  const ref = parseStoredDocumentRef(datei_url)
  if (!ref || ref.bucket !== PARTNER_DOCS_BUCKET) return null
  return ref.path
}

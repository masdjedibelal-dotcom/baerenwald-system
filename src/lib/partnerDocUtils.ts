/** Storage-Bucket für Partner-/Handwerker-Dokumente (Supabase Storage). */
export const PARTNER_DOCS_BUCKET = 'partner-dokumente'

/** Relativer Storage-Pfad oder Legacy-URL → Pfad im Bucket */
export function partnerDokumentStoragePath(datei_url: string | null | undefined): string | null {
  if (!datei_url?.trim()) return null
  const s = datei_url.trim()
  if (!s.startsWith('http')) return s.replace(/^\/+/, '')
  const m = s.match(
    /\/(?:object\/(?:public|sign)\/|storage\/v1\/object\/(?:public|sign)\/)?partner-dokumente\/(.+?)(?:\?|$)/i
  )
  if (m?.[1]) return decodeURIComponent(m[1])
  return null
}

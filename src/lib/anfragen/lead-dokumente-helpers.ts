export const LEAD_DOKUMENTE_BUCKET = 'lead-dokumente'

export function leadDokumentStoragePath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const marker = `/${LEAD_DOKUMENTE_BUCKET}/`
  const idx = stored.indexOf(marker)
  if (idx === -1) return null
  return stored.slice(idx + marker.length)
}

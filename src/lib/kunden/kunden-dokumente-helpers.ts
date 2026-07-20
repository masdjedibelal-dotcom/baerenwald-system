export const KUNDEN_DOKUMENTE_BUCKET = 'kunden-dokumente'

export function kundenDokumentStoragePath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const marker = `/${KUNDEN_DOKUMENTE_BUCKET}/`
  const idx = stored.indexOf(marker)
  if (idx === -1) return null
  return stored.slice(idx + marker.length)
}

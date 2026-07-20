import type { LeadNotizRow } from '@/lib/types'

export const TERMIN_NOTIZ_MAX_FOTOS = 15

export function leadNotizFotoUrls(
  notiz: Pick<LeadNotizRow, 'datei_url' | 'datei_urls'>
): string[] {
  const fromArray = (notiz.datei_urls ?? []).map((u) => u?.trim()).filter(Boolean) as string[]
  if (fromArray.length) return fromArray
  const single = notiz.datei_url?.trim()
  return single ? [single] : []
}

export async function uploadLeadNotizFotos(
  leadId: string,
  files: File[]
): Promise<{ ok: true; urls: string[] } | { ok: false; message: string }> {
  const urls: string[] = []
  for (const file of files) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/anfragen/${leadId}/notiz-foto`, { method: 'POST', body: fd })
    const js: { url?: unknown; error?: unknown } = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        message: typeof js.error === 'string' ? js.error : 'Foto-Upload fehlgeschlagen.',
      }
    }
    const url = typeof js.url === 'string' ? js.url : null
    if (!url) return { ok: false, message: 'Keine Bild-URL erhalten.' }
    urls.push(url)
  }
  return { ok: true, urls }
}

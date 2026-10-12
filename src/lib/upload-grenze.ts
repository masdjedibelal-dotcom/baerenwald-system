import { optimizeImageForUpload } from '@/lib/media/optimize-image-for-upload'

/**
 * Uploads im CRM laufen über Netlify — dort ist bei ~4,5 MB je Anfrage Schluss (sonst „413“).
 * Fotos werden vorher verkleinert, danach gilt die Grenze je Datei.
 */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024
export const UPLOAD_HINWEIS = 'PDF oder Foto · max. 4 MB je Datei'

export function mb(bytes: number): string {
  const wert = bytes / 1024 / 1024
  return `${Number.isInteger(wert) ? wert : wert.toFixed(1).replace('.', ',')} MB`
}

function istBild(file: File): boolean {
  return (file.type || '').startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
}

/** Fotos verkleinern, dann Größe prüfen. Fehlertext nennt Datei und Größe. */
export async function uploadVorbereiten(
  files: File[]
): Promise<{ ok: true; files: File[] } | { ok: false; error: string }> {
  const out: File[] = []
  for (const roh of files) {
    let file = roh
    if (istBild(roh)) {
      try {
        file = await optimizeImageForUpload(roh, { maxEdge: 2400 })
      } catch {
        file = roh
      }
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        error: `„${roh.name}“ ist ${mb(file.size)} groß — erlaubt sind höchstens ${mb(UPLOAD_MAX_BYTES)} pro Datei.${
          istBild(roh) ? '' : ' Bitte das PDF verkleinern oder aufteilen.'
        }`,
      }
    }
    out.push(file)
  }
  return { ok: true, files: out }
}

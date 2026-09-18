'use server'

import { resolveEintragFotoDisplayUrl } from '@/lib/partner/handwerker-uploads'

function storagePathFromMediaRef(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^handwerker-uploads\//, '')
  }
  try {
    const u = new URL(raw)
    const sign = u.pathname.match(
      /\/storage\/v1\/object\/(?:sign|public)\/handwerker-uploads\/(.+)$/
    )
    if (sign?.[1]) return decodeURIComponent(sign[1])
  } catch {
    /* ignore */
  }
  return null
}

/** Abgelaufene HW-Foto-URL neu signieren (MediaThumb). */
export async function refreshHandwerkerMediaUrl(input: {
  url?: string | null
  storagePath?: string | null
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const path =
    storagePathFromMediaRef(input.storagePath) || storagePathFromMediaRef(input.url)
  if (!path) return { ok: false, message: 'Kein Storage-Pfad.' }
  const url = await resolveEintragFotoDisplayUrl(path, 604800)
  if (!url) return { ok: false, message: 'URL nicht erzeugbar.' }
  return { ok: true, url }
}

import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { VIZ_STORAGE_BUCKET } from '@/lib/visualize/constants'

type ClaudeMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

function normalizeMediaType(contentType: string): ClaudeMediaType {
  const t = contentType.split(';')[0]?.trim().toLowerCase()
  if (t === 'image/png') return 'image/png'
  if (t === 'image/webp') return 'image/webp'
  if (t === 'image/gif') return 'image/gif'
  return 'image/jpeg'
}

/** Lädt Visualisierungs-Bilder serverseitig — Claude braucht keinen öffentlichen URL-Zugriff. */
export async function loadVizImageBase64ForClaude(
  stored: string
): Promise<{ mediaType: ClaudeMediaType; data: string }> {
  const v = stored.trim()
  let buffer: Buffer
  let contentType = 'image/jpeg'

  const pathFromUrl = /^https?:\/\//i.test(v) ? extractStoragePath(v, VIZ_STORAGE_BUCKET) : null
  if (pathFromUrl) {
    const { data, error } = await supabaseAdmin.storage.from(VIZ_STORAGE_BUCKET).download(pathFromUrl)
    if (error || !data) throw new Error('Bild konnte nicht aus dem Storage geladen werden.')
    buffer = Buffer.from(await data.arrayBuffer())
    contentType = data.type || contentType
  } else if (/^https?:\/\//i.test(v)) {
    const res = await fetch(v, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Bild-URL nicht erreichbar (${res.status}).`)
    buffer = Buffer.from(await res.arrayBuffer())
    contentType = res.headers.get('content-type') || contentType
  } else {
    const { data, error } = await supabaseAdmin.storage.from(VIZ_STORAGE_BUCKET).download(v)
    if (error || !data) throw new Error('Bild konnte nicht aus dem Storage geladen werden.')
    buffer = Buffer.from(await data.arrayBuffer())
    contentType = data.type || contentType
  }

  return {
    mediaType: normalizeMediaType(contentType),
    data: buffer.toString('base64'),
  }
}

export function visualisierungPublicUrl(path: string): string {
  const { data } = supabaseAdmin.storage.from(VIZ_STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function persistRemoteImageToVisualisierungen(input: {
  sourceUrl: string
  angebotId: string
  sessionId: string
  version: number
}): Promise<string> {
  const res = await fetch(input.sourceUrl)
  if (!res.ok) throw new Error(`Bild-Download fehlgeschlagen (${res.status})`)

  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${input.angebotId}/${input.sessionId}/v${input.version}.${ext}`
  const buf = Buffer.from(await res.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from(VIZ_STORAGE_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)

  return visualisierungPublicUrl(path)
}

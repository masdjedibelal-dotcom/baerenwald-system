import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { VIZ_STORAGE_BUCKET } from '@/lib/visualize/constants'

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

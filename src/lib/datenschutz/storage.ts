import { supabaseAdmin } from '@/lib/supabase-admin'

/** Bekannte öffentliche Storage-Pfade (Supabase) — Bucket aus URL extrahieren. */
export function parseSupabaseStoragePath(
  url: string
): { bucket: string; path: string } | null {
  try {
    const u = new URL(url)
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/)
    if (!m) return null
    return { bucket: m[1], path: decodeURIComponent(m[2]) }
  } catch {
    return null
  }
}

export async function deleteStorageObjectsFromUrls(urls: string[]): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = []
  let removed = 0
  const byBucket = new Map<string, Set<string>>()

  for (const raw of urls) {
    const url = raw?.trim()
    if (!url) continue
    const p = parseSupabaseStoragePath(url)
    if (!p) continue
    if (!byBucket.has(p.bucket)) byBucket.set(p.bucket, new Set())
    byBucket.get(p.bucket)!.add(p.path)
  }

  for (const [bucket, paths] of Array.from(byBucket.entries())) {
    const list = Array.from(paths)
    if (!list.length) continue
    const { error } = await supabaseAdmin.storage.from(bucket).remove(list)
    if (error) errors.push(`${bucket}: ${error.message}`)
    else removed += list.length
  }

  return { removed, errors }
}

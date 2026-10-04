import type { AngebotStatusEinfachRow } from '@/lib/angebot-einfach'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'

export type AngebotListenZeile = AngebotStatusEinfachRow & {
  id: string
  created_at: string
  updated_at?: string | null
  lead_id?: string | null
  kunde_id?: string | null
}

export function findeNeuestenEntwurf<T extends AngebotListenZeile>(rows: T[]): T | null {
  const entwuerfe = rows.filter((r) => resolveStatusEinfach(r) === 'entwurf')
  if (!entwuerfe.length) return null
  return [...entwuerfe].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
}

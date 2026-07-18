import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { AngebotDetail } from '@/lib/types'

const ANGEBOT_DETAIL_SELECT = `
  *,
  kunden(*),
  leads(
    id,
    kontakt_name,
    situation,
    bereiche,
    kunden!kunde_id(*)
  ),
  angebot_handwerker(
    *,
    handwerker(id, name, email, telefon, firma),
    gewerke(id, name, slug)
  )
`

/** Voller Angebots-Datensatz für Detail-Tabs (auch eingebettet in Auftrag/Rechnung). */
export async function loadAngebotDetail(
  supabase: SupabaseClient,
  id: string
): Promise<AngebotDetail | null> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('angebote').select(ANGEBOT_DETAIL_SELECT).eq('id', id).maybeSingle()
  )
  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: normalizeAngebotPositionen(row.positionen),
  }
}

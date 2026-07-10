import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { auftragIstBauprojekt, gewerkSlugsSuggerierenBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import type { GewerkBauprojektHinweis } from '@/lib/auftraege/ist-bauprojekt'

/** Nachunternehmervertrag nur bei Bauprojekt — Standardauftrag: Portal-Annahme reicht. */
export async function auftragErfordertProjektvertrag(auftragId: string): Promise<boolean> {
  const aid = auftragId.trim()
  if (!aid) return false

  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select('ist_bauprojekt')
    .eq('id', aid)
    .maybeSingle()

  if (error || !auftrag) return false

  const explicit = (auftrag as { ist_bauprojekt?: boolean | null }).ist_bauprojekt
  if (explicit === false) return false
  if (explicit === true) return true

  const [{ data: posRows }, { data: gewerkeRaw }] = await Promise.all([
    supabaseAdmin.from('auftrag_positionen').select('gewerk_slug').eq('auftrag_id', aid),
    supabaseAdmin.from('gewerke').select('slug, ist_bauleistung'),
  ])

  const slugs = (posRows ?? [])
    .map((p) => (p as { gewerk_slug?: string | null }).gewerk_slug?.trim())
    .filter(Boolean) as string[]

  return auftragIstBauprojekt({
    ist_bauprojekt: null,
    gewerkSlugs: slugs,
    alleGewerke: (gewerkeRaw ?? []) as GewerkBauprojektHinweis[],
  })
}

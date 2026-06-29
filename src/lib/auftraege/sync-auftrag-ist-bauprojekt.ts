import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { gewerkSlugsSuggerierenBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import type { GewerkBauprojektHinweis } from '@/lib/auftraege/ist-bauprojekt'

/**
 * Leitet `auftraege.ist_bauprojekt` aus Positionen ab — nur wenn nicht manuell gesetzt.
 * Explizit `true` oder `false` bleibt unverändert (Toggle im Auftrag-Detail).
 */
export async function syncAuftragIstBauprojekt(
  auftragId: string
): Promise<{ ok: true; ist_bauprojekt: boolean } | { ok: false; message: string }> {
  const id = auftragId.trim()
  if (!id) return { ok: false, message: 'Auftrag fehlt' }

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select('ist_bauprojekt')
    .eq('id', id)
    .maybeSingle()

  if (aErr) return { ok: false, message: aErr.message }
  if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden' }

  const explicit = (auftrag as { ist_bauprojekt?: boolean | null }).ist_bauprojekt
  if (explicit === true || explicit === false) {
    return { ok: true, ist_bauprojekt: explicit }
  }

  const { data: positionen, error: pErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_slug')
    .eq('auftrag_id', id)

  if (pErr) return { ok: false, message: pErr.message }

  const slugs = (positionen ?? [])
    .map((p) => (p as { gewerk_slug?: string | null }).gewerk_slug?.trim())
    .filter(Boolean) as string[]

  const { data: gewerkeRows, error: gErr } = await supabaseAdmin
    .from('gewerke')
    .select('slug, ist_bauleistung')

  if (gErr) return { ok: false, message: gErr.message }

  const hatBau = gewerkSlugsSuggerierenBauprojekt(
    slugs,
    (gewerkeRows ?? []) as GewerkBauprojektHinweis[]
  )

  const { error: upErr } = await supabaseAdmin
    .from('auftraege')
    .update({ ist_bauprojekt: hatBau, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (upErr) return { ok: false, message: upErr.message }

  return { ok: true, ist_bauprojekt: hatBau }
}

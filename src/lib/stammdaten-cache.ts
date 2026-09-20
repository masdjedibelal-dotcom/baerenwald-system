/**
 * P3-5: gecachte Stammdaten (Gewerke, Preislisten, Firmeneinstellungen).
 * Invalidierung über revalidateStammdaten() / revalidateWizardContext().
 */
import { unstable_cache, revalidateTag } from 'next/cache'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Gewerk, Preisliste } from '@/lib/types'

export const STAMMDATEN_GEWERKE_TAG = 'stammdaten-gewerke'
export const STAMMDATEN_PREISLISTEN_TAG = 'stammdaten-preislisten'
export const STAMMDATEN_FIRMA_TAG = 'stammdaten-firma'
export const STAMMDATEN_TTL_SEC = 120

const loadActiveGewerkeCached = unstable_cache(
  async (): Promise<Gewerk[]> => {
    const { data } = await supabaseAdmin
      .from('gewerke')
      .select('id, name, slug, aktiv, ausfuehrung, fachbetrieb_hinweis')
      .eq('aktiv', true)
      .order('name')
    return (data ?? []) as Gewerk[]
  },
  ['stammdaten-gewerke-v1'],
  { revalidate: STAMMDATEN_TTL_SEC, tags: [STAMMDATEN_GEWERKE_TAG] }
)

const loadActivePreislistenCached = unstable_cache(
  async (): Promise<Preisliste[]> => {
    const { data } = await supabaseAdmin
      .from('preislisten')
      .select('id, gewerk_id, leistung, einheit, preis_min, aktiv, gewerke(id,name,slug)')
      .eq('aktiv', true)
    return (data ?? []) as unknown as Preisliste[]
  },
  ['stammdaten-preislisten-v1'],
  { revalidate: STAMMDATEN_TTL_SEC, tags: [STAMMDATEN_PREISLISTEN_TAG] }
)

const loadFirmenEinstellungenCached = unstable_cache(
  async (): Promise<FirmenEinstellungen> => fetchFirmenEinstellungen(supabaseAdmin),
  ['stammdaten-firma-v1'],
  { revalidate: STAMMDATEN_TTL_SEC, tags: [STAMMDATEN_FIRMA_TAG] }
)

export async function loadCachedActiveGewerke(): Promise<Gewerk[]> {
  return loadActiveGewerkeCached()
}

export async function loadCachedActivePreislisten(): Promise<Preisliste[]> {
  return loadActivePreislistenCached()
}

/** Firmeneinstellungen (gecacht) — für PDF/Mail/Wizard statt Frisch-Select. */
export async function loadCachedFirmenEinstellungen(): Promise<FirmenEinstellungen> {
  return loadFirmenEinstellungenCached()
}

export function revalidateStammdaten(): void {
  revalidateTag(STAMMDATEN_GEWERKE_TAG)
  revalidateTag(STAMMDATEN_PREISLISTEN_TAG)
  revalidateTag(STAMMDATEN_FIRMA_TAG)
}

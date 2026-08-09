import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Gewerk, Preisliste } from '@/lib/types'

export type WizardContext = {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
}

const loadWizardContextCached = unstable_cache(
  async (): Promise<WizardContext> => {
    const db = supabaseAdmin
    const [{ data: gewerke }, { data: preisRaw }, firm] = await Promise.all([
      db
        .from('gewerke')
        .select('id, name, slug, aktiv, ausfuehrung, fachbetrieb_hinweis')
        .eq('aktiv', true)
        .order('name'),
      db
        .from('preislisten')
        .select('id, gewerk_id, leistung, einheit, preis_min, aktiv, gewerke(id,name,slug)')
        .eq('aktiv', true),
      fetchFirmenEinstellungen(db),
    ])

    return {
      gewerke: (gewerke ?? []) as Gewerk[],
      preislisten: (preisRaw ?? []) as unknown as Preisliste[],
      firm,
    }
  },
  ['wizard-context-v1'],
  { revalidate: 120, tags: ['wizard-context'] }
)

/** Gewerke, Preislisten und Firmendaten — gecacht (~2 Min). */
export async function loadWizardContext(_supabase?: SupabaseClient): Promise<WizardContext> {
  return loadWizardContextCached()
}

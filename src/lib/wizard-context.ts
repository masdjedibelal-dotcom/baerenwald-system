import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste } from '@/lib/types'

export type WizardContext = {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
}

/** Gewerke, Preislisten und Firmendaten — zentral für Wizard-Bootstrap. */
export async function loadWizardContext(supabase: SupabaseClient): Promise<WizardContext> {
  const [{ data: gewerke }, { data: preisRaw }, firm] = await Promise.all([
    supabase
      .from('gewerke')
      .select('id, name, slug, aktiv, ausfuehrung, fachbetrieb_hinweis')
      .eq('aktiv', true)
      .order('name'),
    supabase
      .from('preislisten')
      .select('id, gewerk_id, leistung, einheit, preis_min, aktiv, gewerke(id,name,slug)')
      .eq('aktiv', true),
    fetchFirmenEinstellungen(supabase),
  ])

  return {
    gewerke: (gewerke ?? []) as Gewerk[],
    preislisten: (preisRaw ?? []) as unknown as Preisliste[],
    firm,
  }
}

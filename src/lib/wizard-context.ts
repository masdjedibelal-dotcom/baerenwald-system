import { revalidateTag } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  loadCachedActiveGewerke,
  loadCachedActivePreislisten,
  loadCachedFirmenEinstellungen,
  revalidateStammdaten,
} from '@/lib/stammdaten-cache'
import type { Gewerk, Preisliste } from '@/lib/types'

/** @deprecated Tag-Name bleibt für bestehende revalidateTag-Aufrufe kompatibel. */
export const WIZARD_CONTEXT_TAG = 'wizard-context'

export type WizardContext = {
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
}

/** Gewerke, Preislisten und Firmendaten — via Stammdaten-Cache (~2 Min). */
export async function loadWizardContext(_supabase?: SupabaseClient): Promise<WizardContext> {
  const [gewerke, preislisten, firm] = await Promise.all([
    loadCachedActiveGewerke(),
    loadCachedActivePreislisten(),
    loadCachedFirmenEinstellungen(),
  ])
  return { gewerke, preislisten, firm }
}

/** Nach Schreib-Actions auf Stammdaten / Preislisten / Firma. */
export function revalidateWizardContext(): void {
  revalidateTag(WIZARD_CONTEXT_TAG)
  revalidateStammdaten()
}

'use server'

import { createClient } from '@/lib/supabase-server'
import { loadWizardContext } from '@/lib/wizard-context'
import type { Handwerker } from '@/lib/types'

/** On-demand: Wizard-Daten wenn Anfrage ohne Bootstrap geöffnet wurde. */
export async function loadAnfrageWizardBootstrap(): Promise<{
  ok: true
  gewerke: Awaited<ReturnType<typeof loadWizardContext>>['gewerke']
  preislisten: Awaited<ReturnType<typeof loadWizardContext>>['preislisten']
  firm: Awaited<ReturnType<typeof loadWizardContext>>['firm']
  handwerker: Handwerker[]
} | { ok: false; message: string }> {
  try {
    const supabase = createClient()
    const [ctx, { data: hwRows }] = await Promise.all([
      loadWizardContext(supabase),
      supabase
        .from('handwerker')
        .select('id, name, email, telefon, gewerke, firma, aktiv')
        .eq('aktiv', true)
        .order('name'),
    ])
    return {
      ok: true,
      gewerke: ctx.gewerke,
      preislisten: ctx.preislisten,
      firm: ctx.firm,
      handwerker: (hwRows ?? []) as Handwerker[],
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Wizard-Daten konnten nicht geladen werden.',
    }
  }
}

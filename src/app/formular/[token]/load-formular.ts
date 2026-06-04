import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FormularFeld } from '@/lib/types'
import {
  mergeStoredValues,
  type OeffentlichesFormularInitial,
} from '@/lib/hw-formular-oeffentlich'

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

export async function loadOeffentlichesFormular(
  token: string
): Promise<OeffentlichesFormularInitial | null> {
  const { data, error } = await supabaseAdmin
    .from('hw_formular_einreichungen')
    .select(
      `
      id,
      token,
      status,
      felder_werte,
      foto_urls,
      hw_formular_tabs (
        name,
        felder
      )
    `
    )
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null

  const rawTab = data.hw_formular_tabs as
    | { name: string; felder: unknown }
    | { name: string; felder: unknown }[]
    | null
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab
  if (!tab) return null

  const felder = parseFelder(tab.felder)
  const stored = (data.felder_werte ?? {}) as Record<string, unknown>
  const felder_werte = mergeStoredValues(felder, stored)

  const status = String(data.status ?? 'offen')
  const abgeschlossen = status === 'abgeschlossen'

  return {
    token: data.token as string,
    tabName: tab.name,
    felder,
    felder_werte,
    foto_urls: (data.foto_urls ?? []) as string[],
    status,
    abgeschlossen,
  }
}

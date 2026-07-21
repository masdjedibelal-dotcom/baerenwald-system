import 'server-only'

import { CRM_ACTION_REGISTRY, listCrmAktionen } from '@/lib/copilot/crm-registry'
import { formatUnknownError } from '@/lib/copilot/format-unknown-error'

export { listCrmAktionen }

export async function executeCrmAktion(
  aktion: string,
  params: Record<string, unknown> = {},
  bestaetigt?: boolean
): Promise<unknown> {
  const key = aktion.trim()
  const entry = CRM_ACTION_REGISTRY[key]
  if (!entry) {
    return {
      error: `Unbekannte Aktion: ${key}`,
      hinweis: 'list_crm_aktionen aufrufen für verfügbare Aktionen',
      verfuegbar: listCrmAktionen().map((m) => m.id).slice(0, 30),
    }
  }

  if (entry.meta.bestaetigung && !bestaetigt) {
    if (entry.preview) {
      return entry.preview(params)
    }
    return {
      vorschau: true,
      aktion: key,
      beschreibung: entry.meta.beschreibung,
      params_erwartet: entry.meta.params,
      hinweis: `Zum Ausführen crm_aktion mit aktion "${key}" und bestaetigt: true aufrufen.`,
    }
  }

  try {
    return await entry.handler(params)
  } catch (e) {
    const msg = formatUnknownError(e)
    return { error: msg, aktion: key }
  }
}

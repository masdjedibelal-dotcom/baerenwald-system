import 'server-only'

import { CRM_ACTION_REGISTRY, listCrmAktionen } from '@/lib/copilot/crm-registry'
import { formatUnknownError } from '@/lib/copilot/format-unknown-error'

export { listCrmAktionen }

export async function executeCrmAktion(
  aktion: string,
  params: Record<string, unknown> = {},
  bestaetigt?: boolean
): Promise<unknown> {
  let key = aktion.trim()
  // Aliase aus Alltagssprache
  const aliases: Record<string, string> = {
    mahnung: 'send_zahlungserinnerung',
    mahnung_senden: 'send_zahlungserinnerung',
    zahlungserinnerung: 'send_zahlungserinnerung',
    angebot_senden: 'send_angebot_kunde',
    rechnung_senden: 'send_rechnung',
    rechnung_erstellen: 'create_rechnung_entwurf',
    angebot_erstellen: 'prepare_angebot_wizard',
  }
  const aliasKey = aliases[key.toLowerCase()]
  if (aliasKey) key = aliasKey

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

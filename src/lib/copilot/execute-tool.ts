import 'server-only'

import {
  createAngebotEntwurfCopilot,
  createKundeCopilot,
  getEntity,
  getTermine,
  searchCrm,
  sendeAngebotCopilot,
} from '@/lib/copilot/crm-actions'
import { executeCrmAktion, listCrmAktionen } from '@/lib/copilot/crm-runner'
import {
  listHandwerkerFuerGewerkCopilot,
  prepareAngebotWizardCopilot,
  saveAngebotWizardCopilot,
} from '@/lib/copilot/wizard-copilot'
import {
  createLead,
  createNotiz,
  createTermin,
  getAuftragStatus,
  getHandwerkerOffen,
  getHeutigeTermine,
  getNeueAnfragen,
  getOffeneAngebote,
  getOffeneRechnungen,
  sendMailKunde,
  updateLeadStatus,
} from '@/lib/copilot/tools'

export async function executeCopilotTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_neue_anfragen':
      return getNeueAnfragen()
    case 'get_heutige_termine':
      return getHeutigeTermine()
    case 'get_termine':
      return getTermine(String(input.von), String(input.bis))
    case 'search_crm':
      return searchCrm(
        String(input.query),
        Array.isArray(input.types) ? input.types.map(String) : undefined
      )
    case 'get_entity':
      return getEntity(String(input.typ), String(input.id))
    case 'get_offene_angebote':
      return getOffeneAngebote()
    case 'get_offene_rechnungen':
      return getOffeneRechnungen()
    case 'get_auftrag_status':
      return getAuftragStatus()
    case 'get_handwerker_offen':
      return getHandwerkerOffen()
    case 'list_crm_aktionen':
      return listCrmAktionen(
        typeof input.kategorie === 'string' ? input.kategorie : undefined
      )
    case 'crm_aktion':
      return executeCrmAktion(
        String(input.aktion),
        (input.params as Record<string, unknown>) ?? {},
        input.bestaetigt === true
      )
    case 'prepare_angebot_wizard':
      return prepareAngebotWizardCopilot({
        lead_id: String(input.lead_id),
        angebot_id: typeof input.angebot_id === 'string' ? input.angebot_id : undefined,
      })
    case 'save_angebot_wizard':
      return saveAngebotWizardCopilot(input as Parameters<typeof saveAngebotWizardCopilot>[0])
    case 'list_handwerker_gewerk':
      return listHandwerkerFuerGewerkCopilot(
        String(input.gewerk_slug || input.gewerk_id || '')
      )
    case 'create_termin':
      return createTermin(input as Parameters<typeof createTermin>[0])
    case 'create_notiz':
      return createNotiz(input as Parameters<typeof createNotiz>[0])
    case 'create_kunde':
      return createKundeCopilot(input as Parameters<typeof createKundeCopilot>[0])
    case 'create_angebot_entwurf':
      return createAngebotEntwurfCopilot(
        input as Parameters<typeof createAngebotEntwurfCopilot>[0]
      )
    case 'create_lead':
      return createLead(input as Parameters<typeof createLead>[0])
    case 'update_lead_status':
      return updateLeadStatus(String(input.lead_id), String(input.status))
    case 'send_mail_kunde':
      return sendMailKunde(input as Parameters<typeof sendMailKunde>[0])
    case 'sende_angebot':
      return sendeAngebotCopilot(input as Parameters<typeof sendeAngebotCopilot>[0])
    default:
      return { error: `Unbekanntes Tool: ${name}` }
  }
}

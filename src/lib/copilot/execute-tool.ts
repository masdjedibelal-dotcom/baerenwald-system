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
import { buildCrmOeffnenLink } from '@/lib/copilot/crm-oeffnen'
import {
  formatCrmWissenForTool,
  listCrmWissenThemen,
  lookupCrmWissen,
} from '@/lib/copilot/crm-wissen'
import { planeArbeitstag } from '@/lib/copilot/plane-arbeitstag'
import { readCrmDocument } from '@/lib/copilot/read-document'
import { vorschlageHandwerkerZuordnung } from '@/lib/copilot/handwerker-vorschlaege'
import {
  listTodosCopilot,
  saveTodoCopilot,
  setTodoErledigtCopilot,
} from '@/lib/copilot/todo-copilot'
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
    case 'crm_hilfe': {
      const thema = typeof input.thema === 'string' ? input.thema.trim() : ''
      if (!thema) {
        return {
          themen: listCrmWissenThemen(),
          hinweis: 'Thema nachreichen für Detail — oder Frage als thema senden.',
        }
      }
      const hits = lookupCrmWissen(thema)
      return {
        text: formatCrmWissenForTool(hits),
        treffer: hits.map((h) => h.id),
      }
    }
    case 'crm_oeffnen':
      return buildCrmOeffnenLink({
        ziel: String(input.ziel ?? ''),
        id: typeof input.id === 'string' ? input.id : undefined,
        lead_id: typeof input.lead_id === 'string' ? input.lead_id : undefined,
        kunde_id: typeof input.kunde_id === 'string' ? input.kunde_id : undefined,
        tab: typeof input.tab === 'string' ? input.tab : undefined,
        wizard_step: typeof input.wizard_step === 'number' ? input.wizard_step : undefined,
        focus: typeof input.focus === 'string' ? input.focus : undefined,
      })
    case 'plane_arbeitstag':
      return planeArbeitstag()
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
    case 'read_document':
      return readCrmDocument({
        typ: String(input.typ),
        id: String(input.id),
        include_pdf_text: input.include_pdf_text !== false,
      })
    case 'list_todos':
      return listTodosCopilot({
        nur_wichtige: input.nur_wichtige === true,
        erledigt:
          typeof input.erledigt === 'boolean' ? input.erledigt : undefined,
        kunde_id: typeof input.kunde_id === 'string' ? input.kunde_id : undefined,
        lead_id: typeof input.lead_id === 'string' ? input.lead_id : undefined,
        auftrag_id: typeof input.auftrag_id === 'string' ? input.auftrag_id : undefined,
        limit: typeof input.limit === 'number' ? input.limit : undefined,
      })
    case 'save_todo':
      return saveTodoCopilot({
        id: typeof input.id === 'string' ? input.id : undefined,
        titel: String(input.titel ?? ''),
        beschreibung: typeof input.beschreibung === 'string' ? input.beschreibung : undefined,
        faellig_am: typeof input.faellig_am === 'string' ? input.faellig_am : undefined,
        prioritaet:
          input.prioritaet === 'niedrig' || input.prioritaet === 'hoch' || input.prioritaet === 'normal'
            ? input.prioritaet
            : undefined,
        kunde_id: typeof input.kunde_id === 'string' ? input.kunde_id : undefined,
        lead_id: typeof input.lead_id === 'string' ? input.lead_id : undefined,
        auftrag_id: typeof input.auftrag_id === 'string' ? input.auftrag_id : undefined,
        handwerker_id: typeof input.handwerker_id === 'string' ? input.handwerker_id : undefined,
        zugewiesen_an: typeof input.zugewiesen_an === 'string' ? input.zugewiesen_an : undefined,
      })
    case 'set_todo_erledigt':
      return setTodoErledigtCopilot(
        String(input.id),
        input.erledigt !== false
      )
    case 'vorschlage_handwerker_zuordnung':
      return vorschlageHandwerkerZuordnung({
        angebot_id: typeof input.angebot_id === 'string' ? input.angebot_id : undefined,
        auftrag_id: typeof input.auftrag_id === 'string' ? input.auftrag_id : undefined,
      })
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

import 'server-only'

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
  sendeAngebot,
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
    case 'get_offene_angebote':
      return getOffeneAngebote()
    case 'get_offene_rechnungen':
      return getOffeneRechnungen()
    case 'get_auftrag_status':
      return getAuftragStatus()
    case 'get_handwerker_offen':
      return getHandwerkerOffen()
    case 'create_termin':
      return createTermin(input as Parameters<typeof createTermin>[0])
    case 'create_notiz':
      return createNotiz(input as Parameters<typeof createNotiz>[0])
    case 'create_lead':
      return createLead(input as Parameters<typeof createLead>[0])
    case 'update_lead_status':
      return updateLeadStatus(String(input.lead_id), String(input.status))
    case 'send_mail_kunde':
      return sendMailKunde(input as Parameters<typeof sendMailKunde>[0])
    case 'sende_angebot':
      return sendeAngebot(String(input.angebot_id))
    default:
      return { error: `Unbekanntes Tool: ${name}` }
  }
}

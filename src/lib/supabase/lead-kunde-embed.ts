/** PostgREST-FK-Hint: leads.kunde_id → kunden (Melder). */
export const LEAD_KUNDE_EMBED = 'kunden!kunde_id'

/** PostgREST-FK-Hint: leads.auftraggeber_kunde_id → kunden (Organisation). */
export const LEAD_AUFTRAGGEBER_EMBED = 'kunden!auftraggeber_kunde_id'

/** PostgREST-FK-Hint: kunden → leads (Melder). */
export const KUNDE_LEADS_EMBED = 'leads!kunde_id'

/** PostgREST-FK-Hint: kunden → leads (Organisation als Auftraggeber). */
export const KUNDE_AUFTRAGGEBER_LEADS_EMBED = 'leads!auftraggeber_kunde_id'

/** z. B. `leadKundeEmbed('id, name')` → `kunden!kunde_id(id, name)` */
export function leadKundeEmbed(columns: string): string {
  return `${LEAD_KUNDE_EMBED}(${columns})`
}

export function leadAuftraggeberEmbed(columns: string): string {
  return `${LEAD_AUFTRAGGEBER_EMBED}(${columns})`
}

/** z. B. `kundeLeadsEmbed('id, status')` → `leads!kunde_id(id, status)` */
export function kundeLeadsEmbed(columns: string): string {
  return `${KUNDE_LEADS_EMBED}(${columns})`
}

export function kundeAuftraggeberLeadsEmbed(columns: string): string {
  return `${KUNDE_AUFTRAGGEBER_LEADS_EMBED}(${columns})`
}

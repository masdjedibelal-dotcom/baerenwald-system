import type { LeadKanal } from '@/lib/types'

const HV_KANALE = new Set<LeadKanal>([
  'hv_melder_link',
  'hv_direkt',
  'hv_einladung',
  'hv_manuell',
  'hv_katalog',
])

export type PipelineKontext = 'hv_meldung' | 'direktkunde' | 'website' | 'sonstiges'

export type PipelineKontextLead = {
  kanal?: string | null
  auftraggeber_kunde_id?: string | null
  anlass?: string | null
}

export function resolvePipelineKontext(lead: PipelineKontextLead): PipelineKontext {
  const kanal = (lead.kanal ?? '') as LeadKanal
  if (lead.auftraggeber_kunde_id || (lead.anlass === 'meldung' && HV_KANALE.has(kanal))) {
    return 'hv_meldung'
  }
  if (kanal === 'telefon' || kanal === 'email' || kanal === 'vor_ort') {
    return 'direktkunde'
  }
  if (kanal === 'website') return 'website'
  return 'sonstiges'
}

export const PIPELINE_KONTEXT_LABELS: Record<PipelineKontext, string> = {
  hv_meldung: 'HV-Meldung',
  direktkunde: 'Direktkunde (CRM)',
  website: 'Website-Anfrage',
  sonstiges: 'Sonstiger Kanal',
}

/**
 * Wer hat die Anfrage eingereicht? Eindeutig statt „HV-Meldung“:
 * Mieter (Melde-Link/QR) · Hausverwaltung (Portal/E-Mail) · CRM (wir) · Website.
 * `erfassung_von` ist maßgeblich; `kanal` nur Rückfall für Altfälle.
 */
export function eingangsQuelle(lead: {
  kanal?: string | null
  erfassung_von?: string | null
}): string {
  const von = (lead.erfassung_von ?? '').trim()
  const kanal = (lead.kanal ?? '').trim()
  if (von === 'melder') return 'Mieter · Melde-Link'
  if (von === 'organisation') return kanal === 'email' ? 'Hausverwaltung · E-Mail' : 'Hausverwaltung · Portal'
  if (von === 'crm') return 'CRM (Team)'
  if (kanal === 'hv_melder_link' || kanal === 'hv_einladung') return 'Mieter · Melde-Link'
  if (kanal === 'hv_direkt' || kanal.startsWith('org_')) return 'Hausverwaltung · Portal'
  if (kanal === 'website') return 'Website'
  const wie: Record<string, string> = { telefon: 'Telefon', email: 'E-Mail', whatsapp: 'WhatsApp', vor_ort: 'Vor Ort' }
  return wie[kanal] ? `CRM (Team) · ${wie[kanal]}` : 'CRM (Team)'
}

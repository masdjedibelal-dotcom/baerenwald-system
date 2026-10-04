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

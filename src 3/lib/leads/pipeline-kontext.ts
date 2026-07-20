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

export type PortalSyncLead = {
  vorgang_phase?: string | null
  hv_meldung_status?: string | null
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

/** Grobe Prüfung: Portal-Phase passt nicht zum Auftragsstatus. */
export function portalSyncDivergiert(lead: PortalSyncLead, auftragStatus?: string | null): boolean {
  if (!auftragStatus) return false
  const phase = (lead.vorgang_phase ?? '').trim()
  const hv = (lead.hv_meldung_status ?? '').trim()

  if (auftragStatus === 'abgeschlossen') {
    return phase !== 'abgeschlossen' && hv !== 'abgeschlossen'
  }
  if (auftragStatus === 'storniert') {
    return phase !== 'abgelehnt' && hv !== 'abgelehnt'
  }
  return false
}

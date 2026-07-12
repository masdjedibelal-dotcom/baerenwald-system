import type { LeadAnlass, LeadWithAngebote } from '@/lib/types'

export type AnfragenAnlassFilter = '' | LeadAnlass
export type AnfragenOrgSpezialFilter = '' | 'wartet_freigabe' | 'wartet_melder'

export const ANFRAGEN_ANLASS_FILTER_OPTS: { value: AnfragenAnlassFilter; label: string }[] = [
  { value: '', label: 'Alle Anlässe' },
  { value: 'meldung', label: 'Meldung' },
  { value: 'projekt', label: 'Projekt' },
  { value: 'servicepaket', label: 'Servicepaket' },
]

export const ANFRAGEN_ORG_KANAL_FILTER_OPTS = [
  { value: '', label: 'Alle Org-Kanäle' },
  { value: 'hv_melder_link', label: 'Melde-Link' },
  { value: 'hv_einladung', label: 'HV-Einladung' },
  { value: 'org_portal', label: 'Auftraggeber-Portal' },
] as const

export type AnfragenOrgKanalFilter = (typeof ANFRAGEN_ORG_KANAL_FILTER_OPTS)[number]['value']

export const ANFRAGEN_ORG_SPEZIAL_FILTER_OPTS: { value: AnfragenOrgSpezialFilter; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'wartet_freigabe', label: 'Wartet Freigabe' },
  { value: 'wartet_melder', label: 'Wartet Melder' },
]

export function leadMatchesAnlassFilter(lead: LeadWithAngebote, filter: AnfragenAnlassFilter): boolean {
  if (!filter) return true
  return lead.anlass === filter
}

export function leadMatchesOrgKanalFilter(lead: LeadWithAngebote, filter: AnfragenOrgKanalFilter): boolean {
  if (!filter) return true
  return lead.kanal === filter
}

export function leadMatchesOrgSpezialFilter(
  lead: LeadWithAngebote,
  filter: AnfragenOrgSpezialFilter
): boolean {
  if (!filter) return true
  if (filter === 'wartet_freigabe') return lead.org_freigabe_status === 'ausstehend'
  if (filter === 'wartet_melder') return lead.einladung_status === 'offen'
  return true
}

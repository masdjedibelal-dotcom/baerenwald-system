import type { LeadKanal } from '@/lib/types'

/** Kanäle mit Mieter-/Melder-Schadenmeldungen (Org-Portal). */
export const MELDER_KANALE: LeadKanal[] = ['hv_melder_link', 'hv_einladung']

export function istMelderKanal(kanal: string | null | undefined): boolean {
  return MELDER_KANALE.includes((kanal ?? '') as LeadKanal)
}

export function fotosAusMelderFunnel(funnelDaten: unknown): string[] {
  if (!funnelDaten || typeof funnelDaten !== 'object') return []
  const fotos = (funnelDaten as { fotos?: unknown }).fotos
  if (!Array.isArray(fotos)) return []
  return fotos.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

export function leadHatMelderPersonenbezogeneDaten(lead: {
  melder_name?: string | null
  melder_email?: string | null
  melder_telefon?: string | null
  melder_einheit?: string | null
  kontakt_name?: string | null
  kontakt_email?: string | null
  funnel_daten?: unknown
}): boolean {
  if (lead.melder_name?.trim() && lead.melder_name.trim() !== 'Anonymisiert') return true
  if (lead.melder_email?.trim()) return true
  if (lead.melder_telefon?.trim()) return true
  if (lead.melder_einheit?.trim()) return true
  if (fotosAusMelderFunnel(lead.funnel_daten).length > 0) return true
  if (lead.kontakt_name?.trim() && lead.kontakt_name.trim() !== 'Anonymisiert') return true
  if (lead.kontakt_email?.trim()) return true
  return false
}

export function melderLeadAnzeigeTitel(lead: {
  melder_name?: string | null
  melder_einheit?: string | null
  kontakt_name?: string | null
  id: string
}): string {
  const name = lead.melder_name?.trim() || lead.kontakt_name?.trim()
  const einheit = lead.melder_einheit?.trim()
  if (name && einheit) return `${name} · ${einheit}`
  if (name) return name
  return `Melder-Lead ${lead.id.slice(0, 8).toUpperCase()}`
}

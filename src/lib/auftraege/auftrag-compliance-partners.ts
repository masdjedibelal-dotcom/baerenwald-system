import { gewerkSlugsAusPositionen } from '@/lib/handwerker/compliance-partner-profile'
import type { AuftragDetail, AuftragPosition } from '@/lib/types'

export type AuftragCompliancePartner = {
  handwerkerId: string
  name: string
  firma: string | null
  leistungen: AuftragPosition[]
  /** Gewerk-Slugs der diesem Partner zugewiesenen Leistungen */
  gewerkSlugs: string[]
  /** Vom CRM festgelegte Pflicht-Slugs; null = Auto-Pflicht */
  compliancePflichtSlugs: string[] | null
}

/** Alle Partner mit Leistungen im Auftrag (Positionen + ggf. reine Gewerk-Zuweisung). */
export function sammleAuftragCompliancePartner(
  detail: Pick<AuftragDetail, 'auftrag_positionen' | 'auftrag_handwerker'>
): AuftragCompliancePartner[] {
  const map = new Map<string, AuftragCompliancePartner>()

  for (const pos of detail.auftrag_positionen ?? []) {
    if (!pos.handwerker_id?.trim()) continue
    const id = pos.handwerker_id
    const existing = map.get(id)
    if (existing) {
      existing.leistungen.push(pos)
    } else {
      map.set(id, {
        handwerkerId: id,
        name: pos.handwerker?.name?.trim() || 'Partner',
        firma: null,
        leistungen: [pos],
        gewerkSlugs: [],
        compliancePflichtSlugs: null,
      })
    }
  }

  for (const z of detail.auftrag_handwerker ?? []) {
    if (!z.handwerker_id?.trim()) continue
    const id = z.handwerker_id
    if (!map.has(id)) {
      map.set(id, {
        handwerkerId: id,
        name: z.handwerker?.name?.trim() || z.handwerker?.firma?.trim() || 'Partner',
        firma: z.handwerker?.firma?.trim() || null,
        leistungen: [],
        gewerkSlugs: z.gewerke?.slug ? [z.gewerke.slug] : [],
        compliancePflichtSlugs: z.compliance_pflicht_slugs ?? null,
      })
    } else {
      const row = map.get(id)!
      if (z.compliance_pflicht_slugs != null && row.compliancePflichtSlugs == null) {
        row.compliancePflichtSlugs = z.compliance_pflicht_slugs
      }
      const firma = z.handwerker?.firma?.trim()
      if (firma && !row.firma) row.firma = firma
      const slug = z.gewerke?.slug?.trim()
      if (slug && !row.gewerkSlugs.includes(slug)) row.gewerkSlugs.push(slug)
    }
  }

  for (const partner of Array.from(map.values())) {
    partner.gewerkSlugs = gewerkSlugsAusPositionen(partner.leistungen)
    if (!partner.gewerkSlugs.length) {
      const z = (detail.auftrag_handwerker ?? []).find((h) => h.handwerker_id === partner.handwerkerId)
      if (z?.gewerke?.slug) partner.gewerkSlugs = [z.gewerke.slug]
    }
    partner.leistungen.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

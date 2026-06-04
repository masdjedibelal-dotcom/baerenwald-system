import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { countLegacyDemoLeads, filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import type { LeadWithAngebote } from '@/lib/types'

export const ANFRAGEN_LISTE_SELECT = `
      id,
      kunde_id,
      status,
      kanal,
      situation,
      bereiche,
      bereiche_sonstiges,
      budget_ca,
      preis_min,
      preis_max,
      plz,
      zeitraum,
      zeitraum_von,
      zeitraum_bis,
      kundentyp,
      funnel_daten,
      kontakt_name,
      kontakt_email,
      kontakt_telefon,
      kontakt_nachricht,
      notizen,
      erstellt_von,
      created_at,
      updated_at,
      kunden(id, name, email, telefon),
      angebote(id, status, gesamt_fix, gesamt_min, gesamt_max, created_at)
    `

export async function loadAnfragenListe(): Promise<{
  leads: LeadWithAngebote[]
  legacyDemoCount: number
  error: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('leads').select(ANFRAGEN_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
  )

  if (error) {
    return { leads: [], legacyDemoCount: 0, error: error.message }
  }

  const allLeads = (data ?? []) as unknown as LeadWithAngebote[]
  return {
    leads: filterOutLegacyDemoLeads(allLeads),
    legacyDemoCount: countLegacyDemoLeads(allLeads),
    error: null,
  }
}

export {
  anfrageIdFromPath,
  anfragenFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

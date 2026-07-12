import { ANFRAGEN_LISTE_STATUS } from '@/lib/crm/pipeline-liste-filter'
import { leadKundeEmbed } from '@/lib/supabase/lead-kunde-embed'
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
      anlass,
      org_freigabe_status,
      einladung_status,
      auftraggeber_kunde_id,
      erfassung_von,
      ${leadKundeEmbed('id, name, email, telefon, vorname, nachname, typ')},
      angebote(id, status, gesamt_fix, gesamt_min, gesamt_max, created_at)
    `

export async function loadAnfragenListe(): Promise<{
  leads: LeadWithAngebote[]
  legacyDemoCount: number
  error: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('leads')
      .select(ANFRAGEN_LISTE_SELECT)
      .in('status', [...ANFRAGEN_LISTE_STATUS])
      .order('created_at', { ascending: false })
      .limit(100)
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

import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { AuftragListeEintrag } from '@/lib/types'

export const AUFTRAEGE_LISTE_SELECT = `
      id,
      titel,
      status,
      fortschritt,
      start_datum,
      end_datum,
      abnahme_datum,
      created_at,
      kunden(id, name, email, telefon, adresse, plz, ort, vorname, nachname, typ),
      angebote(id, gesamt_fix, gesamt_min, gesamt_max)
    `

export async function loadAuftraegeListe(): Promise<{
  auftraege: AuftragListeEintrag[]
  error: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('auftraege').select(AUFTRAEGE_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
  )

  if (error) {
    return { auftraege: [], error: error.message }
  }

  return { auftraege: (data ?? []) as unknown as AuftragListeEintrag[], error: null }
}

export {
  auftragIdFromPath,
  auftraegeFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

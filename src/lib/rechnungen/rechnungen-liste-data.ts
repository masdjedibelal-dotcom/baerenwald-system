import { crmRlsFixHint, withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { RechnungListeZeile } from '@/lib/types'

export const RECHNUNGEN_LISTE_SELECT = `
      id,
      rechnungsnummer,
      status,
      brutto,
      rechnungsdatum,
      faellig_am,
      bezahlt_at,
      erinnerung_7_sent_at,
      erinnerung_21_sent_at,
      positionen,
      lohn_netto,
      material_netto,
      netto,
      mwst_satz,
      kunden(name, vorname, nachname, typ),
      auftraege(titel)
    `

export async function loadRechnungenListe(): Promise<{
  rows: RechnungListeZeile[]
  error: string | null
  rlsHint: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('rechnungen').select(RECHNUNGEN_LISTE_SELECT).order('created_at', { ascending: false })
  )

  if (error) {
    return {
      rows: [],
      error: error.message,
      rlsHint: crmRlsFixHint(error.message),
    }
  }

  return {
    rows: (data ?? []) as RechnungListeZeile[],
    error: null,
    rlsHint: null,
  }
}

export {
  rechnungIdFromPath,
  rechnungenFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

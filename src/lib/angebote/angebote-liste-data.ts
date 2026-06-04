import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { AngebotListeEintrag } from '@/lib/types'

export const ANGEBOTE_LISTE_SELECT = `
      id,
      angebotsnr,
      status,
      status_einfach,
      gesamt_fix,
      gesamt_min,
      gesamt_max,
      gueltig_bis,
      gesendet_am,
      gesendet_kunde_at,
      nachgefasst_am,
      created_at,
      leistungsumfang,
      leads(
        id,
        kontakt_name,
        situation,
        bereiche,
        plz,
        kunden(id, name)
      ),
      kunden(id, name, email, plz, ort)
    `

export async function loadAngeboteListe(): Promise<{
  angebote: AngebotListeEintrag[]
  error: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('angebote').select(ANGEBOTE_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
  )

  if (error) {
    return { angebote: [], error: error.message }
  }

  return { angebote: (data ?? []) as unknown as AngebotListeEintrag[], error: null }
}

export {
  angebotIdFromPath,
  angeboteFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

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
  angebotIdsMitAuftrag: string[]
  error: string | null
}> {
  const [angeboteRes, auftragRes] = await Promise.all([
    withCrmReadFallback(async (db) =>
      db.from('angebote').select(ANGEBOTE_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
    ),
    withCrmReadFallback(async (db) =>
      db.from('auftraege').select('angebot_id').not('angebot_id', 'is', null)
    ),
  ])

  if (angeboteRes.error) {
    return { angebote: [], angebotIdsMitAuftrag: [], error: angeboteRes.error.message }
  }

  const angebotIdsMitAuftrag = Array.from(
    new Set(
      ((auftragRes.data ?? []) as { angebot_id: string | null }[])
        .map((r) => r.angebot_id?.trim())
        .filter(Boolean) as string[]
    )
  )

  return {
    angebote: (angeboteRes.data ?? []) as unknown as AngebotListeEintrag[],
    angebotIdsMitAuftrag,
    error: auftragRes.error?.message ?? null,
  }
}

export {
  angebotIdFromPath,
  angeboteFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

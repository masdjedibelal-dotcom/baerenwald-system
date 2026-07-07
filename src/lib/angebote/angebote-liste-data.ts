import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { leadKundeEmbed } from '@/lib/supabase/lead-kunde-embed'
import { buildAngebotIdsMitAuftrag } from '@/lib/crm/pipeline-liste-filter'
import { buildAngebotIdsMitRechnung } from '@/lib/crm/projekt-pipeline'
import type { AngebotListeEintrag } from '@/lib/types'

export const ANGEBOTE_LISTE_SELECT = `
      id,
      lead_id,
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
        ${leadKundeEmbed('id, name, vorname, nachname, typ')}
      ),
      kunden(id, name, email, plz, ort, vorname, nachname, typ)
    `

export async function loadAngeboteListe(): Promise<{
  angebote: AngebotListeEintrag[]
  angebotIdsMitAuftrag: string[]
  angebotIdsMitRechnung: string[]
  error: string | null
}> {
  const [angeboteRes, auftragRes, rechnungRes] = await Promise.all([
    withCrmReadFallback(async (db) =>
      db.from('angebote').select(ANGEBOTE_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
    ),
    withCrmReadFallback(async (db) =>
      db.from('auftraege').select('angebot_id').not('angebot_id', 'is', null)
    ),
    withCrmReadFallback(async (db) =>
      db.from('rechnungen').select('angebot_id').not('angebot_id', 'is', null)
    ),
  ])

  if (angeboteRes.error) {
    return {
      angebote: [],
      angebotIdsMitAuftrag: [],
      angebotIdsMitRechnung: [],
      error: angeboteRes.error.message,
    }
  }

  const angebotIdsMitAuftrag = Array.from(
    buildAngebotIdsMitAuftrag((auftragRes.data ?? []) as { angebot_id: string | null }[])
  )

  const angebotIdsMitRechnung = Array.from(
    buildAngebotIdsMitRechnung((rechnungRes.data ?? []) as { angebot_id: string | null }[])
  )

  return {
    angebote: (angeboteRes.data ?? []) as unknown as AngebotListeEintrag[],
    angebotIdsMitAuftrag,
    angebotIdsMitRechnung,
    error: auftragRes.error?.message ?? rechnungRes.error?.message ?? null,
  }
}

export {
  angebotIdFromPath,
  angeboteFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

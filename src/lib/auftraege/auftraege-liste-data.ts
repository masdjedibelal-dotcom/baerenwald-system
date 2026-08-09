import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import {
  buildAuftragPipelineKontextMap,
  buildRechnungenByAuftragId,
  type AuftragPipelineKontext,
} from '@/lib/crm/projekt-pipeline'
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
      zahlungsplan,
      kunden(id, name, email, telefon, adresse, plz, ort, vorname, nachname, typ),
      angebote(id, gesamt_fix, gesamt_min, gesamt_max, zahlungsplan, zahlungsbedingungen)
    `

export async function loadAuftraegeListe(): Promise<{
  auftraege: AuftragListeEintrag[]
  pipelineKontextByAuftragId: Record<string, AuftragPipelineKontext>
  error: string | null
}> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('auftraege').select(AUFTRAEGE_LISTE_SELECT).order('created_at', { ascending: false }).limit(100)
  )

  if (error) {
    return { auftraege: [], pipelineKontextByAuftragId: {}, error: error.message }
  }

  const auftraege = (data ?? []) as unknown as AuftragListeEintrag[]
  const auftragIds = auftraege.map((a) => a.id).filter(Boolean)

  let rechnungenByAuftragId: Record<string, import('@/lib/rechnungen/zahlungsplan').RechnungAbschlagLink[]> =
    {}
  if (auftragIds.length) {
    const { data: recRows, error: recErr } = await withCrmReadFallback(async (db) =>
      db
        .from('rechnungen')
        .select(
          'id, auftrag_id, rechnung_art, abschlag_index, zahlungsplan_abschlag_id, status, brutto'
        )
        .in('auftrag_id', auftragIds)
    )
    if (!recErr && recRows) {
      rechnungenByAuftragId = buildRechnungenByAuftragId(recRows)
    }
  }

  return {
    auftraege,
    pipelineKontextByAuftragId: buildAuftragPipelineKontextMap(auftraege, rechnungenByAuftragId),
    error: null,
  }
}

export {
  auftragIdFromPath,
  auftraegeFullBleedSubRoute,
} from '@/lib/crm/master-detail-paths'

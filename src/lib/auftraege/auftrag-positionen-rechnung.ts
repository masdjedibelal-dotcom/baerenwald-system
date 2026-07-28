import { neuePositionsId } from '@/lib/angebot-positionen'
import {
  formatRegieSchaetzung,
  formatRegieSollIst,
  istRegiePosition,
  REGIE_BADGE_LABEL,
} from '@/lib/auftraege/regie-display'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

export type RegieZeitByPosition = Record<string, number>

/**
 * Auftragspositionen → Angebot-Positionsformat für Rechnungseditor.
 * Regie: Menge/Preis aus Bautagebuch-Zeiten wenn vorhanden; sonst Stundensatz-Schätzung.
 * notiz_extern trägt Soll/Ist + Regieschein-Hinweis (CRM-intern „Regie“).
 */
export function auftragPositionenToAngebotPositionen(
  positionen: AuftragPosition[],
  opts?: { regieZeitMinutenByPositionId?: RegieZeitByPosition }
): AngebotPosition[] {
  const zeitMap = opts?.regieZeitMinutenByPositionId ?? {}

  return [...positionen]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => {
      const isRegie = istRegiePosition(p)
      const erfasstMin = zeitMap[p.id] ?? 0
      const stundensatz = Number(p.stundensatz) || 0
      const geschStd = Number(p.geschaetzt_std) || 0

      let menge = Math.max(p.menge ?? 1, 0.0001)
      let lineNetto = Math.round((p.preis_fix ?? 0) * 100) / 100
      let lohn = Math.round((p.lohn_fix ?? 0) * 100) / 100
      let material = Math.round((p.material_fix ?? 0) * 100) / 100
      let einheit = p.einheit?.trim() || 'pauschal'

      if (isRegie) {
        einheit = 'Std'
        if (erfasstMin > 0 && stundensatz > 0) {
          menge = Math.round((erfasstMin / 60) * 100) / 100
          lineNetto = Math.round(menge * stundensatz * 100) / 100
          lohn = lineNetto
          material = 0
        } else if (stundensatz > 0) {
          menge = geschStd > 0 ? geschStd : 1
          lineNetto = Math.round(menge * stundensatz * 100) / 100
          lohn = lineNetto
          material = 0
        }
      }

      const stueck =
        lohn + material > 0
          ? Math.round(((lohn + material) / menge) * 100) / 100
          : Math.round((lineNetto / menge) * 100) / 100

      const schaetzung = formatRegieSchaetzung({
        geschaetztStd: geschStd || (isRegie ? menge : null),
        stundensatz: stundensatz || (isRegie ? stueck : null),
      })
      const sollIst = formatRegieSollIst({
        geschaetztStd: geschStd || null,
        erfasstMinuten: erfasstMin || null,
      })
      const regieNotiz = isRegie
        ? [
            REGIE_BADGE_LABEL,
            schaetzung,
            sollIst,
            erfasstMin > 0 ? 'Regieschein: aus Bautagebuch' : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : undefined

      return {
        id: p.id || neuePositionsId(),
        gewerk_id: '',
        gewerk_name: p.gewerk_name?.trim() || '—',
        gewerk_slug: p.gewerk_slug ?? undefined,
        gewerk_block_key: p.gewerk_block_key ?? undefined,
        leistung: p.leistung_name?.trim() || 'Leistung',
        leistung_name: p.leistung_name,
        beschreibung: p.beschreibung?.trim() || '',
        lohn_netto: lohn > 0 ? lohn / menge : stueck,
        material_netto: material > 0 ? material / menge : 0,
        vk_netto: stueck,
        gesamt_min: lineNetto,
        gesamt_max: lineNetto,
        menge,
        einheit,
        preis_typ: 'fix',
        mwst_satz: 19,
        handwerker_id: p.handwerker_id ?? undefined,
        handwerker_name: p.handwerker?.name ?? undefined,
        notiz_extern: regieNotiz || undefined,
      } satisfies AngebotPosition
    })
}

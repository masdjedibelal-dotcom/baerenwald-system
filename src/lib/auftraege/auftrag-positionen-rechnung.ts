import { neuePositionsId } from '@/lib/angebot-positionen'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

/** Auftragspositionen → Angebot-Positionsformat für Rechnungseditor */
export function auftragPositionenToAngebotPositionen(positionen: AuftragPosition[]): AngebotPosition[] {
  return [...positionen]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => {
      const menge = Math.max(p.menge ?? 1, 0.0001)
      const lineNetto = Math.round((p.preis_fix ?? 0) * 100) / 100
      const lohn = Math.round((p.lohn_fix ?? 0) * 100) / 100
      const material = Math.round((p.material_fix ?? 0) * 100) / 100
      const stueck =
        lohn + material > 0
          ? Math.round(((lohn + material) / menge) * 100) / 100
          : Math.round((lineNetto / menge) * 100) / 100

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
        einheit: p.einheit?.trim() || 'pauschal',
        preis_typ: 'fix',
        mwst_satz: 19,
        handwerker_id: p.handwerker_id ?? undefined,
        handwerker_name: p.handwerker?.name ?? undefined,
      } satisfies AngebotPosition
    })
}

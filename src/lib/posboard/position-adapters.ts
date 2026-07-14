import type { AngebotPosition, AuftragPosition } from '@/lib/types'

/** Auftragspositionen → PosBoard-kompatibles Format (read-only). */
export function auftragPositionenToPosBoard(items: AuftragPosition[]): AngebotPosition[] {
  return items.map((p) => {
    const vk =
      p.preis_fix != null
        ? Number(p.preis_fix)
        : (Number(p.lohn_fix ?? 0) + Number(p.material_fix ?? 0)) || 0
    const menge = Number(p.menge) || 0
    return {
      id: p.id,
      gewerk_id: p.gewerk_slug ?? p.gewerk_name,
      gewerk_name: p.gewerk_name,
      gewerk_slug: p.gewerk_slug ?? undefined,
      gewerk_block_key: p.gewerk_block_key ?? undefined,
      leistung: p.leistung_name,
      leistung_name: p.leistung_name,
      beschreibung: p.beschreibung ?? p.leistung_name,
      lohn_netto: Number(p.lohn_fix ?? 0),
      material_netto: Number(p.material_fix ?? 0),
      vk_netto: vk,
      gesamt_min: vk,
      gesamt_max: vk,
      menge,
      einheit: p.einheit ?? 'Stk',
      handwerker_id: p.handwerker_id ?? undefined,
      handwerker_name: p.handwerker?.name ?? undefined,
    }
  })
}

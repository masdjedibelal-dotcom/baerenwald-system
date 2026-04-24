import type { AngebotPosition } from '@/lib/types'
import { zeilenNettoMinMax } from '@/lib/angebot-positionen'

export type AuftragPositionInsert = {
  auftrag_id: string
  gewerk_slug: string | null
  gewerk_name: string
  oberkategorie: string | null
  unterkategorie: string | null
  leistung_name: string
  beschreibung: string | null
  einheit: string
  menge: number
  preis_fix: number | null
  lohn_fix: number | null
  material_fix: number | null
  handwerker_id: string | null
  sort_order: number
}

function preisZeileNetto(p: AngebotPosition): number {
  const { min } = zeilenNettoMinMax(p)
  return Math.round(min * 100) / 100
}

/** Angebots-Positionen → Zeilen für `auftrag_positionen` (nach Auftrag-Insert). */
export function angebotPositionenToAuftragRows(
  auftragId: string,
  positionen: AngebotPosition[]
): AuftragPositionInsert[] {
  return positionen.map((p, i) => {
    const m = p.menge || 1
    const preis = preisZeileNetto(p)
    const beschreibung = [p.beschreibung, p.notiz_extern].filter(Boolean).join('\n').trim() || null
    const leistung_name = (p.leistung_name || p.leistung || p.beschreibung || 'Leistung').toString().slice(0, 500)
    const lohnZeile = Math.round(p.lohn_netto * m * 100) / 100
    const matZeile = Math.round(p.material_netto * m * 100) / 100
    return {
      auftrag_id: auftragId,
      gewerk_slug: p.gewerk_slug?.trim() || null,
      gewerk_name: (p.gewerk_name || 'Gewerk').toString().slice(0, 500),
      oberkategorie: null,
      unterkategorie: null,
      leistung_name,
      beschreibung: beschreibung ? beschreibung.slice(0, 4000) : null,
      einheit: (p.einheit || 'pauschal').toString().slice(0, 80),
      menge: m,
      preis_fix: preis > 0 ? preis : null,
      lohn_fix: lohnZeile > 0 ? lohnZeile : null,
      material_fix: matZeile > 0 ? matZeile : null,
      handwerker_id: p.handwerker_id?.trim() || null,
      sort_order: i * 10,
    }
  })
}

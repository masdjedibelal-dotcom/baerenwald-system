import type { AngebotPosition } from '@/lib/types'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
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
  projekt_phase?: string | null
  gewerk_block_key?: string | null
  start_datum?: string | null
  end_datum?: string | null
  preis_partner?: number | null
}

function preisZeileNetto(p: AngebotPosition): number {
  const { min } = zeilenNettoMinMax(p)
  return Math.round(min * 100) / 100
}

/** Angebots-Positionen → Zeilen für `auftrag_positionen` (nach Auftrag-Insert). */
export function angebotPositionenToAuftragRows(
  auftragId: string,
  positionen: AngebotPosition[],
  opts?: {
    gewerkEkByGewerkId?: Map<string, number>
    partnerPreisByPositionId?: Map<string, number>
  }
): AuftragPositionInsert[] {
  const ekMap = opts?.gewerkEkByGewerkId
  const posPreisMap = opts?.partnerPreisByPositionId
  return positionen
    .filter((p) => !istGewerkBeschreibungPosition(p))
    .map((p, i) => {
    const m = p.menge || 1
    const preis = preisZeileNetto(p)
    const beschreibung = [p.beschreibung, p.notiz_extern].filter(Boolean).join('\n').trim() || null
    const leistung_name = (p.leistung_name || p.leistung || p.beschreibung || 'Leistung').toString().slice(0, 500)
    const lohnZeile = Math.round(p.lohn_netto * m * 100) / 100
    const matZeile = Math.round(p.material_netto * m * 100) / 100
    const hatHandwerker = !!p.handwerker_id?.trim()
    const konditionPreis =
      p.id && posPreisMap?.has(p.id) ? posPreisMap.get(p.id)! : null
    const ekZeile =
      p.einkaufspreis != null && p.einkaufspreis > 0
        ? Math.round(p.einkaufspreis * m * 100) / 100
        : null
    const gewerkEk =
      p.gewerk_id && ekMap?.has(p.gewerk_id) ? ekMap.get(p.gewerk_id)! : null
    const partnerPreis =
      konditionPreis != null && konditionPreis > 0
        ? konditionPreis
        : ekZeile != null && ekZeile > 0
          ? ekZeile
          : hatHandwerker
            ? gewerkEk != null && gewerkEk > 0
              ? gewerkEk
              : lohnZeile + matZeile > 0
                ? lohnZeile + matZeile
                : null
            : gewerkEk != null && gewerkEk > 0
              ? gewerkEk
              : null
    return {
      auftrag_id: auftragId,
      gewerk_slug: p.gewerk_slug?.trim() || null,
      gewerk_name: (p.gewerk_name || 'Gewerk').toString().slice(0, 500),
      gewerk_block_key: p.gewerk_block_key?.trim() || p.gewerk_id?.trim() || p.gewerk_slug?.trim() || null,
      projekt_phase: 'Ausführung',
      oberkategorie: null,
      unterkategorie: null,
      leistung_name,
      beschreibung: beschreibung ? beschreibung.slice(0, 4000) : null,
      einheit: (p.einheit || 'pauschal').toString().slice(0, 80),
      menge: m,
      preis_fix: preis > 0 ? preis : null,
      lohn_fix: lohnZeile > 0 ? lohnZeile : null,
      material_fix: matZeile > 0 ? matZeile : null,
      preis_partner: partnerPreis,
      handwerker_id: p.handwerker_id?.trim() || null,
      sort_order: i * 10,
    }
  })
}

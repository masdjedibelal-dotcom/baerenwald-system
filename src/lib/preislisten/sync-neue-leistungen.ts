import { positionVkNettoStueck } from '@/lib/angebot-positionen'
import { istPreisPosition } from '@/lib/dokument-zeilen'
import type { DokumentArtikelZeile } from '@/lib/dokument-zeilen'
import type { ProjektWasZeile } from '@/lib/lead-projekt-was'
import type { AngebotPosition } from '@/lib/types'

export type NeueLeistungSyncInput = {
  gewerk_id: string
  leistung: string
  einheit: string
  preisliste_id?: string | null
  /** Stückpreis netto; fehlt → 0 */
  vkNetto?: number
  gewerk_slug?: string
}

function normLeistungKey(gewerk_id: string, leistung: string): string {
  return `${gewerk_id.trim()}::${leistung.trim().toLowerCase()}`
}

export function syncInputsFromDokumentArtikel(
  zeilen: DokumentArtikelZeile[]
): NeueLeistungSyncInput[] {
  return zeilen.map((z) => ({
    gewerk_id: z.gewerk_id ?? '',
    leistung: z.bezeichnung.trim(),
    einheit: z.einheit || 'Stk.',
    preisliste_id: z.preisliste_id,
    vkNetto: z.vkNetto,
    gewerk_slug: z.gewerk_slug,
  }))
}

export function syncInputsFromAngebotPositionen(
  positionen: AngebotPosition[]
): NeueLeistungSyncInput[] {
  return positionen.filter(istPreisPosition).map((p) => ({
    gewerk_id: p.gewerk_id,
    leistung: p.leistung,
    einheit: p.einheit || 'Stk.',
    preisliste_id: p.leistung_id,
    vkNetto: positionVkNettoStueck(p),
    gewerk_slug: p.gewerk_slug,
  }))
}

export function syncInputsFromProjektWasZeilen(
  zeilen: ProjektWasZeile[]
): NeueLeistungSyncInput[] {
  return zeilen.map((z) => ({
    gewerk_id: z.gewerk_id ?? '',
    leistung: z.titel.trim(),
    einheit: z.einheit || 'pauschal',
    preisliste_id: z.preisliste_id,
    vkNetto: 0,
  }))
}

export { normLeistungKey }

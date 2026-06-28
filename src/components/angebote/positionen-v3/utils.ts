import {
  istFreitextPosition,
  istGewerkBeschreibungPosition,
} from '@/lib/dokument-zeilen'
import { positionNettoZeile } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'
import type { AngebotPositionBlockGroup } from '@/lib/angebote/angebot-position-blocks'
import { positionenFuerSummen } from '@/lib/angebote/angebot-position-blocks'

export function angebotPositionAnzeigeTitel(p: AngebotPosition): string {
  const leistung = (p.leistung_name || p.leistung || '').trim()
  if (istFreitextPosition(p)) {
    if (leistung && leistung !== 'Freitext') return leistung
    return (p.gewerk_name || '').trim() || 'Freitext'
  }
  return leistung || (p.beschreibung || '').trim() || '—'
}

export function angebotRowMarge(p: AngebotPosition): { ek: number; marge: number; pct: number | null } {
  const vk = positionNettoZeile(p)
  const ek = Math.max(0, (p.einkaufspreis ?? 0) * (p.menge || 1))
  const marge = vk - ek
  const pct = vk > 0 ? Math.round((marge / vk) * 1000) / 10 : null
  return { ek, marge, pct }
}

export function blockVkSummeAngebot(block: AngebotPositionBlockGroup): number {
  return positionenFuerSummen(block).reduce((s, p) => s + positionNettoZeile(p), 0)
}

export function angebotPositionenFuerAnzeige(positionen: AngebotPosition[]): AngebotPosition[] {
  return positionen.filter((p) => !istGewerkBeschreibungPosition(p))
}

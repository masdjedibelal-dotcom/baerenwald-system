/**
 * Phase 12 / Spec §16 — gemeinsame Quelle für Regiebericht + Bautagebuch.
 * Positions-Dokumentation (`position_eintraege` + Material/Fotos) + Schichten (`v_auftrag_tagesspannen`).
 */

import type { AuftragTagesspanne, PositionEintrag } from '@/lib/auftraege/position-lebenszyklus'
import {
  formatRegieSollIst,
  formatStundenColon,
  formatStundenDecimalAsColon,
} from '@/lib/auftraege/regie-display'

export type BerichtPositionMeta = {
  id: string
  leistung_name: string
  beschreibung?: string | null
  typ?: string | null
  verguetung?: string | null
  gewerk_name?: string | null
  stundensatz?: number | null
  geschaetzt_std?: number | null
  handwerker_name?: string | null
  handwerker_firma?: string | null
}

export type BerichtMaterialZeile = {
  position_id: string
  bezeichnung: string
  menge: number
  einzelpreis: number
  gesamt: number
}

export type BerichtZeiterfassungZeile = {
  datum: string
  position_id: string | null
  position_label: string
  beschreibung: string
  minuten: number
  typ: string
}

export type BerichtTagPositionBlock = {
  position_id: string | null
  position_label: string
  gewerk_name: string | null
  eintraege: PositionEintrag[]
  minuten: number
  fotoCount: number
}

export type BerichtTagBlock = {
  tag: string
  schicht: AuftragTagesspanne | null
  schichtMinuten: number
  partnerMinuten: number
  positionen: BerichtTagPositionBlock[]
}

export type BerichtDatenquelle = {
  auftragId: string
  projektTitel: string
  projektAdresse: string
  auftraggeberName: string
  eintraege: PositionEintrag[]
  schichten: AuftragTagesspanne[]
  positionen: BerichtPositionMeta[]
  material: BerichtMaterialZeile[]
  /** Alle Einträge als Zeiterfassungszeilen (sortiert). */
  zeiterfassung: BerichtZeiterfassungZeile[]
  /** Zweistufig: Tag → Position (Bautagebuch). */
  tage: BerichtTagBlock[]
  summeMinuten: number
  summeMaterialNetto: number
}

function tagOf(e: PositionEintrag): string {
  return (e.ereignis_zeit || e.created_at || '').slice(0, 10)
}

function schichtMinuten(sp: AuftragTagesspanne | null | undefined): number {
  if (!sp) return 0
  return Math.max(
    0,
    Math.round((new Date(sp.spanne_bis).getTime() - new Date(sp.spanne_von).getTime()) / 60_000)
  )
}

function positionLabel(
  positionId: string | null | undefined,
  positionen: BerichtPositionMeta[]
): string {
  if (!positionId) return 'Ohne Leistungsbezug'
  const p = positionen.find((x) => x.id === positionId)
  return p?.leistung_name?.trim() || `Position ${positionId.slice(0, 8)}`
}

/** Reine Aggregation — keine DB-Zugriffe. */
export function buildBerichtDatenquelle(input: {
  auftragId: string
  projektTitel: string
  projektAdresse: string
  auftraggeberName: string
  eintraege: PositionEintrag[]
  schichten: AuftragTagesspanne[]
  positionen: BerichtPositionMeta[]
  material: BerichtMaterialZeile[]
}): BerichtDatenquelle {
  const positionen = input.positionen
  const eintraege = [...input.eintraege].sort((a, b) => {
    const ta = new Date(a.ereignis_zeit || a.created_at || 0).getTime()
    const tb = new Date(b.ereignis_zeit || b.created_at || 0).getTime()
    return ta - tb
  })

  const zeiterfassung: BerichtZeiterfassungZeile[] = eintraege.map((e) => ({
    datum: tagOf(e) || '—',
    position_id: e.position_id,
    position_label: positionLabel(e.position_id, positionen),
    beschreibung: (e.beschreibung || e.beschreibung_roh || '').trim() || '—',
    minuten: Number(e.zeit_minuten) || 0,
    typ: String(e.typ || 'notiz'),
  }))

  const byTag = new Map<string, PositionEintrag[]>()
  for (const e of eintraege) {
    const t = tagOf(e)
    if (!t) continue
    const list = byTag.get(t) ?? []
    list.push(e)
    byTag.set(t, list)
  }

  const tags = new Set<string>([
    ...Array.from(byTag.keys()),
    ...input.schichten.map((s) => String(s.tag).slice(0, 10)),
  ])

  const tage: BerichtTagBlock[] = Array.from(tags)
    .sort()
    .map((tag) => {
      const dayEntries = byTag.get(tag) ?? []
      const schicht =
        input.schichten.find((s) => String(s.tag).slice(0, 10) === tag) ?? null
      const byPos = new Map<string, PositionEintrag[]>()
      for (const e of dayEntries) {
        const key = e.position_id ?? '__free__'
        const list = byPos.get(key) ?? []
        list.push(e)
        byPos.set(key, list)
      }
      const positionBlocks: BerichtTagPositionBlock[] = Array.from(byPos.entries()).map(
        ([key, entries]) => {
          const position_id = key === '__free__' ? null : key
          const meta = position_id ? positionen.find((p) => p.id === position_id) : null
          const minuten = entries.reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
          const fotoCount = entries.reduce((s, e) => s + (e.eintrag_fotos?.length ?? 0), 0)
          return {
            position_id,
            position_label: positionLabel(position_id, positionen),
            gewerk_name: meta?.gewerk_name ?? null,
            eintraege: entries,
            minuten,
            fotoCount,
          }
        }
      )
      positionBlocks.sort((a, b) => a.position_label.localeCompare(b.position_label, 'de'))
      const partnerMinuten = dayEntries.reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
      return {
        tag,
        schicht,
        schichtMinuten: schichtMinuten(schicht),
        partnerMinuten,
        positionen: positionBlocks,
      }
    })

  const summeMinuten = eintraege.reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
  const summeMaterialNetto = input.material.reduce((s, m) => s + m.gesamt, 0)

  return {
    auftragId: input.auftragId,
    projektTitel: input.projektTitel,
    projektAdresse: input.projektAdresse,
    auftraggeberName: input.auftraggeberName,
    eintraege,
    schichten: input.schichten,
    positionen,
    material: input.material,
    zeiterfassung,
    tage,
    summeMinuten,
    summeMaterialNetto: Math.round(summeMaterialNetto * 100) / 100,
  }
}

export function filterBerichtAufPosition(
  data: BerichtDatenquelle,
  positionId: string
): BerichtDatenquelle {
  const eintraege = data.eintraege.filter((e) => e.position_id === positionId)
  const material = data.material.filter((m) => m.position_id === positionId)
  const positionen = data.positionen.filter((p) => p.id === positionId)
  return buildBerichtDatenquelle({
    auftragId: data.auftragId,
    projektTitel: data.projektTitel,
    projektAdresse: data.projektAdresse,
    auftraggeberName: data.auftraggeberName,
    eintraege,
    schichten: data.schichten,
    positionen,
    material,
  })
}

export function berichtSollIstFuerPosition(
  data: BerichtDatenquelle,
  positionId: string
): string | null {
  const pos = data.positionen.find((p) => p.id === positionId)
  const erfasst = data.eintraege
    .filter((e) => e.position_id === positionId)
    .reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
  return formatRegieSollIst({
    geschaetztStd: pos?.geschaetzt_std ?? null,
    erfasstMinuten: erfasst,
  })
}

export function formatBerichtMinuten(minuten: number): string {
  return formatStundenColon(minuten)
}

export function formatBerichtSchichtLabel(sp: AuftragTagesspanne | null): string {
  if (!sp) return '—'
  const von = String(sp.spanne_von).slice(11, 16) || String(sp.spanne_von)
  const bis = String(sp.spanne_bis).slice(11, 16) || String(sp.spanne_bis)
  return `${von}–${bis} Uhr · ${formatStundenColon(schichtMinuten(sp))}`
}

export { formatStundenDecimalAsColon, formatRegieSollIst }

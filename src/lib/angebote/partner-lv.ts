import { neuePositionsId } from '@/lib/angebot-positionen'
import { parseHwKonditionen } from '@/lib/partner/hw-konditionen'
import { neuePosBoardLine, type PosBoardLine } from '@/lib/posboard/pos-board-line'
import type { AngebotPosition, Gewerk } from '@/lib/types'

export type PartnerLvVorgabe = {
  leistung: string
  menge: number
  einheit: string
  gewerk_name?: string
  gewerk_id?: string
  preisliste_id?: string | null
}

export type PartnerLvZeile = {
  leistung: string
  menge: number
  einheit: string
  einzelpreisNetto: number
  gewerkName: string
}

function normName(s: string): string {
  return s.trim().toLowerCase()
}

export function posBoardToPartnerLvVorgabe(lines: PosBoardLine[]): PartnerLvVorgabe[] {
  const out: PartnerLvVorgabe[] = []
  for (const l of lines) {
    if (l.kind === 'freitext' || l.kind === 'nachlass') continue
    const leistung = l.name.trim()
    if (!leistung) continue
    out.push({
      leistung,
      menge: l.menge > 0 ? l.menge : 1,
      einheit: l.einheit.trim() || 'Stk.',
      gewerk_name: l.gewerk.trim() || undefined,
      preisliste_id: l.preisliste_id ?? null,
    })
  }
  return out
}

/** Intern-Angebot-JSON für die LV-Vorgabe an den Partner (Preis bleibt leer). */
export function partnerLvVorgabeToAngebotPositionen(
  rows: PartnerLvVorgabe[],
  gewerke: Array<{ id: string; name: string; slug?: string }>
): Record<string, unknown>[] {
  return rows.map((r) => {
    const gName = r.gewerk_name?.trim() || ''
    const g =
      (r.gewerk_id && gewerke.find((x) => x.id === r.gewerk_id)) ||
      gewerke.find((x) => normName(x.name) === normName(gName)) ||
      null
    return {
      id: neuePositionsId(),
      leistung: r.leistung,
      leistung_name: r.leistung,
      beschreibung: r.leistung,
      menge: r.menge,
      einheit: r.einheit,
      gewerk_id: g?.id ?? r.gewerk_id ?? '',
      gewerk_name: g?.name ?? gName,
      gewerk_slug: g?.slug,
      preisliste_id: r.preisliste_id ?? null,
      vk_netto: 0,
      lohn_netto: 0,
      material_netto: 0,
      gesamt_min: 0,
      gesamt_max: 0,
    }
  })
}

export function parsePartnerLvZeilen(hwKonditionen: unknown): PartnerLvZeile[] {
  const parsed = parseHwKonditionen(hwKonditionen)
  if (!parsed?.positionen.length) return []
  const out: PartnerLvZeile[] = []
  for (const p of parsed.positionen) {
    const leistung = p.leistung.trim()
    if (!leistung) continue
    const menge = p.menge && p.menge > 0 ? p.menge : 1
    const einzel = menge > 0 ? Math.round((p.hw_netto / menge) * 100) / 100 : p.hw_netto
    if (leistung === 'Leistung' && einzel <= 0) continue
    out.push({
      leistung,
      menge,
      einheit: p.einheit?.trim() || 'Stk.',
      einzelpreisNetto: einzel,
      gewerkName: p.gewerk_name?.trim() || '',
    })
  }
  return out
}

export function collectEingereichtePartnerLv(
  rows: Array<{
    hw_eingereicht_at?: string | null
    hw_konditionen?: unknown
  }>
): PartnerLvZeile[] {
  const out: PartnerLvZeile[] = []
  for (const r of rows) {
    if (!r.hw_eingereicht_at?.trim()) continue
    out.push(...parsePartnerLvZeilen(r.hw_konditionen))
  }
  return out
}

function matchGewerk(name: string, gewerke: Gewerk[]): Gewerk | null {
  const n = normName(name)
  if (!n) return null
  return gewerke.find((g) => normName(g.name) === n) ?? null
}

export function partnerLvZeilenToAngebotPositionen(
  zeilen: PartnerLvZeile[],
  gewerke: Gewerk[]
): AngebotPosition[] {
  const fallback = gewerke[0] ?? null
  const out: AngebotPosition[] = []
  for (const z of zeilen) {
    const g = matchGewerk(z.gewerkName, gewerke) ?? fallback
    const menge = z.menge > 0 ? z.menge : 1
    const einzel = z.einzelpreisNetto > 0 ? z.einzelpreisNetto : 0
    const zeile = Math.round(einzel * menge * 100) / 100
    out.push({
      id: neuePositionsId(),
      gewerk_id: g?.id ?? '',
      gewerk_name: g?.name || z.gewerkName || 'Allgemein',
      gewerk_slug: g?.slug,
      leistung: z.leistung,
      leistung_name: z.leistung,
      beschreibung: z.leistung,
      menge,
      einheit: z.einheit || 'Stk.',
      vk_netto: einzel,
      lohn_netto: einzel,
      material_netto: 0,
      gesamt_min: zeile,
      gesamt_max: zeile,
      einkaufspreis: einzel,
      preis_typ: 'fix',
    })
  }
  return out
}

export function partnerLvZeilenToPosBoardLines(zeilen: PartnerLvZeile[]): PosBoardLine[] {
  return zeilen.map((z) =>
    neuePosBoardLine({
      name: z.leistung,
      gewerk: z.gewerkName || 'Allgemein',
      menge: z.menge > 0 ? z.menge : 1,
      einheit: z.einheit || 'Stk.',
      preis: z.einzelpreisNetto > 0 ? z.einzelpreisNetto : 0,
    })
  )
}

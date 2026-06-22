import { normalizeAngebotPositionen, neuePositionsId } from '@/lib/angebot-positionen'
import {
  groupAngebotPositionenByBlock,
  resolveBlockTitelFromGroup,
} from '@/lib/angebote/angebot-position-blocks'
import { istGesamtrabattPosition, istGewerkBeschreibungLeistungName } from '@/lib/dokument-zeilen'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { richTextToChecklistLines, richTextToPlain } from '@/lib/rich-text'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'

export type AbnahmePunktStatus = 'offen' | 'ok' | 'mangel'

export type AbnahmePunkt = {
  id: string
  gewerk: string
  /** Auftragsposition oder Gruppe für Freitext-Punkte */
  leistung_id?: string | null
  leistung_name?: string | null
  /** Text der Checkliste (Bullet) */
  beschreibung: string
  status: AbnahmePunktStatus
  notiz?: string | null
  foto_urls?: string[]
}

export type AbnahmeMangelStatus = 'offen' | 'in_bearbeitung' | 'behoben' | 'abgenommen'

export type AbnahmeMangelVerlaufEintrag = {
  at: string
  typ: string
  notiz?: string | null
}

export type AbnahmeMangel = {
  punkt_id: string
  beschreibung: string
  foto_urls?: string[]
  frist: string | null
  status?: AbnahmeMangelStatus
  erfasst_at?: string
  behoben_at?: string | null
  abgenommen_at?: string | null
  behoben_von?: string | null
  handwerker_id?: string | null
  foto_nachher_urls?: string[]
  verlauf?: AbnahmeMangelVerlaufEintrag[]
}

export type AuftragAbnahmeprotokoll = {
  id: string
  auftrag_id: string
  abnahme_datum: string
  notizen: string | null
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  pdf_url: string | null
  an_kunde_gesendet_at: string | null
  created_at?: string | null
}

export type AbnahmeLeistungGruppe = {
  leistung_id: string
  leistung_name: string
  punkte: AbnahmePunkt[]
}

export type AbnahmeGewerkBlock = {
  gewerk: string
  leistungen: AbnahmeLeistungGruppe[]
}

function leistungKey(p: AbnahmePunkt): string {
  return p.leistung_id?.trim() || p.id
}

function leistungName(p: AbnahmePunkt): string {
  return p.leistung_name?.trim() || p.beschreibung?.trim() || 'Leistung'
}

function abnahmeCheckpunkt(
  gewerk: string,
  leistung_id: string,
  leistung_name: string,
  beschreibung: string
): AbnahmePunkt {
  return {
    id: neuePositionsId(),
    gewerk,
    leistung_id,
    leistung_name,
    beschreibung,
    status: 'offen',
    notiz: null,
    foto_urls: [],
  }
}

function checklistAusPosition(p: AngebotPosition): string[] {
  const leistung = (p.leistung || p.leistung_name || 'Leistung').trim()
  const raw = (p.beschreibung ?? '').trim()
  if (!raw) return [leistung]
  const plain = richTextToPlain(raw)
  if (!plain || plain === leistung) return [leistung]
  const lines = richTextToChecklistLines(raw)
  return lines.length > 0 ? lines : [leistung]
}

/** Gewerk → Leistung → Checklistenpunkte (Reihenfolge aus Auftragspositionen). */
export function gruppiereAbnahmePunkte(punkte: AbnahmePunkt[]): AbnahmeGewerkBlock[] {
  const gewerkOrder: string[] = []
  const byGewerk = new Map<string, Map<string, AbnahmeLeistungGruppe>>()

  for (const p of punkte) {
    const gewerk = p.gewerk?.trim() || 'Sonstiges'
    if (!byGewerk.has(gewerk)) {
      byGewerk.set(gewerk, new Map())
      gewerkOrder.push(gewerk)
    }
    const byLeistung = byGewerk.get(gewerk)!
    const lid = leistungKey(p)
    if (!byLeistung.has(lid)) {
      byLeistung.set(lid, {
        leistung_id: lid,
        leistung_name: leistungName(p),
        punkte: [],
      })
    }
    byLeistung.get(lid)!.punkte.push(p)
  }

  return gewerkOrder.map((gewerk) => ({
    gewerk,
    leistungen: Array.from(byGewerk.get(gewerk)!.values()),
  }))
}

/** Checkliste 1:1 aus Angebot (Gewerk-Abschnitte, Beschreibung, Leistungs-Bullets). */
export function punkteAusAngebotPositionen(
  positionen: AngebotPosition[],
  gewerke: Pick<Gewerk, 'id' | 'name' | 'slug'>[] = []
): AbnahmePunkt[] {
  const pos = normalizeAngebotPositionen(positionen)
  if (!pos.length) return []

  const groups = groupAngebotPositionenByBlock(pos, gewerke as Gewerk[])
  const punkte: AbnahmePunkt[] = []

  for (const group of groups) {
    const gewerk = resolveBlockTitelFromGroup(group, gewerke as Gewerk[])

    for (const entry of group.entries) {
      if (entry.kind === 'freitext') {
        const { titel, text } = entry.freitext
        const isGewerkBeschreibung = istGewerkBeschreibungLeistungName(titel)
        const leistungName = isGewerkBeschreibung ? 'Leistungsumfang' : titel.trim() || 'Zusatz'
        const leistungId = `${group.key}|${isGewerkBeschreibung ? 'gewerk-beschreibung' : titel || 'freitext'}`
        const bullets = richTextToChecklistLines(text)
        if (bullets.length === 0) continue
        for (const bullet of bullets) {
          punkte.push(abnahmeCheckpunkt(gewerk, leistungId, leistungName, bullet))
        }
        continue
      }

      const p = entry.position
      if (istGesamtrabattPosition(p)) continue

      const leistungName = (p.leistung || p.leistung_name || 'Leistung').trim()
      const leistungId = p.id?.trim() || `${group.key}|${leistungName}`
      for (const bullet of checklistAusPosition(p)) {
        punkte.push(abnahmeCheckpunkt(gewerk, leistungId, leistungName, bullet))
      }
    }
  }

  return punkte
}

/** Fallback ohne Angebot-JSON: Auftragspositionen → Angebotsformat → gleiche Struktur. */
export function punkteAusAuftragPositionen(
  positionen: AuftragPosition[],
  gewerke: Pick<Gewerk, 'id' | 'name' | 'slug'>[] = []
): AbnahmePunkt[] {
  if (!positionen.length) return []
  return punkteAusAngebotPositionen(auftragPositionenToAngebotPositionen(positionen), gewerke)
}

export function neuerBulletUnterLeistung(
  gewerk: string,
  leistung_id: string,
  leistung_name: string
): AbnahmePunkt {
  return {
    id: neuePositionsId(),
    gewerk,
    leistung_id,
    leistung_name,
    beschreibung: '',
    status: 'offen',
    notiz: null,
    foto_urls: [],
  }
}

export function neuerAbnahmePunktFreitext(): AbnahmePunkt {
  const id = neuePositionsId()
  return {
    id,
    gewerk: 'Sonstiges',
    leistung_id: id,
    leistung_name: 'Zusätzlicher Punkt',
    beschreibung: '',
    status: 'offen',
    notiz: null,
    foto_urls: [],
  }
}

export { maengelAusPunkten, mergeMaengelFromPunkte, countOffeneMaengel, isMangelOffen } from '@/lib/auftraege/abnahme-maengel-helpers'

export function abnahmePunkteStatistik(punkte: AbnahmePunkt[]): {
  ok: number
  mangel: number
  offen: number
  gesamt: number
} {
  let ok = 0
  let mangel = 0
  let offen = 0
  for (const p of punkte) {
    if (p.status === 'ok') ok++
    else if (p.status === 'mangel') mangel++
    else offen++
  }
  return { ok, mangel, offen, gesamt: punkte.length }
}

export function buildAbnahmePunkteInitial(
  opts: {
    positionen: AuftragPosition[]
    angebotPositionen?: AngebotPosition[] | null
    gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  }
): AbnahmePunkt[] {
  if (opts.angebotPositionen?.length) {
    return punkteAusAngebotPositionen(opts.angebotPositionen, opts.gewerke ?? [])
  }
  return punkteAusAuftragPositionen(opts.positionen, opts.gewerke ?? [])
}

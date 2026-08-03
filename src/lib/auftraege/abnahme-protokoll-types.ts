import { normalizeAngebotPositionen, neuePositionsId } from '@/lib/angebot-positionen'
import {
  groupAngebotPositionenByBlock,
  resolveBlockTitelFromGroup,
} from '@/lib/angebote/angebot-position-blocks'
import { istGesamtrabattPosition, istGewerkBeschreibungLeistungName } from '@/lib/dokument-zeilen'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { decodeHtmlEntities, richTextToChecklistLines, richTextToPlain } from '@/lib/rich-text'
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
  /** @deprecated — bitte `notizen` nutzen; wird beim Laden migriert */
  notiz?: string | null
  /** Beliebig viele Notizen zur Leistung (am ersten Punkt der Gruppe gespeichert) */
  notizen?: string[]
  foto_urls?: string[]
  /** Bei Status „mangel“: Frist zur Beseitigung (YYYY-MM-DD) */
  mangel_frist?: string | null
}

export type AbnahmeMangelStatus = 'offen' | 'in_bearbeitung' | 'behoben' | 'abgenommen'

export type AbnahmeMangelVerlaufEintrag = {
  at: string
  typ: string
  notiz?: string | null
}

export type AbnahmeMangel = {
  punkt_id: string
  /** Kurztitel (PDF fett); optional — sonst gilt `beschreibung` als Titel */
  titel?: string | null
  /** Detail / Notiz (PDF kleiner darunter) bzw. Legacy-Einzeiler */
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

/** Freier Mangel-Checklistenpunkt in der Abnahme-UI. */
export type AbnahmeMangelCheckItem = {
  id: string
  titel: string
  notiz: string
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
  handwerker_id?: string | null
  ebene?: 'handwerker' | 'gesamt'
  freigabe_status?: 'entwurf' | 'zur_freigabe' | 'freigegeben' | 'abgelehnt'
  freigegeben_at?: string | null
  freigegeben_von?: string | null
  abgelehnt_at?: string | null
  ablehnung_notiz?: string | null
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

/** Freier Abschnitt ohne Katalog-Gewerk (wie freie Position im Angebot). */
export const ABNAHME_GEWERK_OHNE = 'Ohne Gewerk'

export function abnahmeGewerkLabel(gewerk: string | null | undefined): string {
  const t = (gewerk ?? '').trim()
  if (!t || /^sonstiges$/i.test(t)) return ABNAHME_GEWERK_OHNE
  return t
}

function leistungKey(p: AbnahmePunkt): string {
  return p.leistung_id?.trim() || p.id
}

function leistungName(p: AbnahmePunkt): string {
  return bereinigeAbnahmeLeistungName(p.leistung_name)
}

/** Alte Default-Bezeichnung aus dem Freitext-Block entfernen. */
export function bereinigeAbnahmeLeistungName(name: string | null | undefined): string {
  const t = decodeHtmlEntities(name ?? '').replace(/\s+/g, ' ').trim()
  if (!t || /^zusätzlicher punkt$/i.test(t)) return ''
  return t
}

/** Notizen einer Leistungsgruppe (Plural + Legacy `notiz`). */
export function notizenFuerLeistung(punkte: AbnahmePunkt[]): string[] {
  if (!punkte.length) return []
  const primary = punkte[0]
  if (primary.notizen && primary.notizen.length > 0) {
    return primary.notizen
      .map((n) => decodeHtmlEntities(String(n ?? '')).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  }
  const legacy = punkte
    .map((p) => decodeHtmlEntities(p.notiz ?? '').replace(/\s+/g, ' ').trim())
    .filter((n): n is string => Boolean(n))
  return legacy
}

/** Schreibt Notizen auf den ersten Punkt der Leistung, räumt Legacy auf den Geschwistern. */
export function setNotizenFuerLeistung(
  alle: AbnahmePunkt[],
  leistungId: string,
  notizen: string[]
): AbnahmePunkt[] {
  let first = true
  return alle.map((p) => {
    if (leistungKey(p) !== leistungId) return p
    if (first) {
      first = false
      return { ...p, notizen: [...notizen], notiz: null }
    }
    return { ...p, notizen: undefined, notiz: null }
  })
}

/** Alle Notiztexte eines Punkts (für PDF). */
export function notizenEinesPunkts(p: AbnahmePunkt): string[] {
  if (p.notizen?.length) {
    return p.notizen
      .map((n) => decodeHtmlEntities(String(n ?? '')).replace(/\s+/g, ' ').trim())
      .filter((n) => n.length > 0)
  }
  const legacy = decodeHtmlEntities(p.notiz ?? '').replace(/\s+/g, ' ').trim()
  return legacy ? [legacy] : []
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
    const gewerk = abnahmeGewerkLabel(p.gewerk)
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
    gewerk: abnahmeGewerkLabel(gewerk),
    leistung_id,
    leistung_name,
    beschreibung: '',
    status: 'ok',
    notiz: null,
    foto_urls: [],
  }
}

/** Freier Gewerk-/Leistungs-Block — Name und Titel sind editierbar. */
export function neuerAbnahmePunktFreitext(gewerkName?: string): AbnahmePunkt {
  const id = neuePositionsId()
  return {
    id,
    gewerk: abnahmeGewerkLabel(gewerkName || 'Neues Gewerk'),
    leistung_id: id,
    leistung_name: '',
    beschreibung: '',
    status: 'ok',
    notiz: null,
    foto_urls: [],
  }
}

/** Neue Position (Leistung) unter einem Gewerk-Abschnitt. */
export function neueAbnahmeLeistungUnterGewerk(
  gewerk: string,
  leistungName = ''
): AbnahmePunkt {
  const id = neuePositionsId()
  return {
    id,
    gewerk: abnahmeGewerkLabel(gewerk),
    leistung_id: id,
    leistung_name: leistungName,
    beschreibung: '',
    status: 'ok',
    notiz: null,
    foto_urls: [],
  }
}

export function flattenAbnahmeBlocks(blocks: AbnahmeGewerkBlock[]): AbnahmePunkt[] {
  return blocks.flatMap((b) =>
    b.leistungen.flatMap((l) =>
      l.punkte.map((p) => ({
        ...p,
        gewerk: b.gewerk,
        leistung_id: l.leistung_id,
        leistung_name: l.leistung_name,
      }))
    )
  )
}

function moveIndex<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export function reorderAbnahmeGewerkBlocks(
  punkte: AbnahmePunkt[],
  fromIndex: number,
  toIndex: number
): AbnahmePunkt[] {
  const blocks = gruppiereAbnahmePunkte(punkte)
  return flattenAbnahmeBlocks(moveIndex(blocks, fromIndex, toIndex))
}

export function reorderAbnahmeLeistungen(
  punkte: AbnahmePunkt[],
  gewerk: string,
  fromIndex: number,
  toIndex: number
): AbnahmePunkt[] {
  const blocks = gruppiereAbnahmePunkte(punkte)
  const next = blocks.map((b) =>
    b.gewerk === gewerk
      ? { ...b, leistungen: moveIndex(b.leistungen, fromIndex, toIndex) }
      : b
  )
  return flattenAbnahmeBlocks(next)
}

export function reorderAbnahmePunkteInLeistung(
  punkte: AbnahmePunkt[],
  leistungId: string,
  fromIndex: number,
  toIndex: number
): AbnahmePunkt[] {
  const blocks = gruppiereAbnahmePunkte(punkte)
  const next = blocks.map((b) => ({
    ...b,
    leistungen: b.leistungen.map((l) =>
      l.leistung_id === leistungId
        ? { ...l, punkte: moveIndex(l.punkte, fromIndex, toIndex) }
        : l
    ),
  }))
  return flattenAbnahmeBlocks(next)
}

export function renameAbnahmeGewerk(
  punkte: AbnahmePunkt[],
  fromGewerk: string,
  toGewerk: string
): AbnahmePunkt[] {
  const next = abnahmeGewerkLabel(toGewerk)
  const from = abnahmeGewerkLabel(fromGewerk)
  if (!next || next === from) return punkte
  return punkte.map((p) =>
    abnahmeGewerkLabel(p.gewerk) === from ? { ...p, gewerk: next } : p
  )
}

export function renameAbnahmeLeistung(
  punkte: AbnahmePunkt[],
  leistungId: string,
  toName: string
): AbnahmePunkt[] {
  const next = bereinigeAbnahmeLeistungName(toName)
  return punkte.map((p) => {
    const key = p.leistung_id?.trim() || p.id
    if (key !== leistungId) return p
    return { ...p, leistung_name: next }
  })
}

/** Titel + optionale Notiz einer Leistungsgruppe setzen (UI Stift). */
export function setTitelUndNotizFuerLeistung(
  alle: AbnahmePunkt[],
  leistungId: string,
  titel: string,
  notiz: string
): AbnahmePunkt[] {
  const name = bereinigeAbnahmeLeistungName(titel)
  const note = notiz.trim()
  let first = true
  return alle.map((p) => {
    const key = p.leistung_id?.trim() || p.id
    if (key !== leistungId) return p
    if (first) {
      first = false
      return {
        ...p,
        leistung_name: name || p.beschreibung?.trim() || 'Leistung',
        beschreibung: name || p.beschreibung || 'Leistung',
        notizen: note ? [note] : [],
        notiz: null,
      }
    }
    return { ...p, leistung_name: name || p.leistung_name, notizen: undefined, notiz: null }
  })
}

/** Auftragsposition → Abnahmepunkt (Status offen = noch nicht abgehakt). */
export function abnahmePunktAusAuftragPosition(pos: AuftragPosition): AbnahmePunkt {
  const id = pos.id?.trim() || neuePositionsId()
  const name = (pos.leistung_name ?? '').trim() || 'Leistung'
  const beschreibung = richTextToPlain(pos.beschreibung ?? '').trim()
  return {
    id: neuePositionsId(),
    gewerk: abnahmeGewerkLabel(pos.gewerk_name || ABNAHME_GEWERK_OHNE),
    leistung_id: id,
    leistung_name: name,
    beschreibung: beschreibung || name,
    status: 'offen',
    notiz: null,
    notizen: [],
    foto_urls: [],
  }
}

/** Freie erbrachte Leistung ohne Katalog-Bezug. */
export function abnahmePunktErbrachteLeistung(titel = '', notiz = ''): AbnahmePunkt {
  const id = neuePositionsId()
  const name = bereinigeAbnahmeLeistungName(titel) || 'Erbrachte Leistung'
  const note = notiz.trim()
  return {
    id,
    gewerk: ABNAHME_GEWERK_OHNE,
    leistung_id: id,
    leistung_name: name,
    beschreibung: name,
    status: 'offen',
    notiz: null,
    notizen: note ? [note] : [],
    foto_urls: [],
  }
}

export function neuerMangelCheckItem(titel = '', notiz = ''): AbnahmeMangelCheckItem {
  return { id: neuePositionsId(), titel, notiz }
}

export function maengelFromCheckItems(
  items: AbnahmeMangelCheckItem[],
  erfasstAt = new Date().toISOString()
): AbnahmeMangel[] {
  return items
    .map((item) => {
      const titel = item.titel.trim()
      const notiz = item.notiz.trim()
      if (!titel && !notiz) return null
      return {
        punkt_id: item.id,
        titel: titel || null,
        beschreibung: notiz || titel || 'Mangel',
        foto_urls: [] as string[],
        frist: null as string | null,
        status: 'offen' as const,
        erfasst_at: erfasstAt,
        foto_nachher_urls: [] as string[],
        verlauf: [{ at: erfasstAt, typ: 'erfasst', notiz: 'Bei Abnahme erfasst' }],
      }
    })
    .filter((m): m is NonNullable<typeof m> => m != null)
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

/**
 * Leistung für Abnahme ausgewählt (Haken) — nicht „abgenommen“.
 * `offen` = nicht abnahme-relevant, wird in PDFs weggelassen.
 */
export function leistungFuerAbnahmeAusgewaehlt(punkte: AbnahmePunkt[]): boolean {
  return punkte.length > 0 && punkte.every((p) => p.status !== 'offen')
}

/** Nur ausgewählte Abnahmepunkte für PDF/Dokumente (ohne Status-„Abgenommen“). */
export function filterAbnahmePunkteFuerDokument(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.filter((p) => p.status === 'ok' || p.status === 'mangel')
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

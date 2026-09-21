/** Wann eine Rechnung wie korrigiert wird. */

import { logDbError } from '@/lib/errors/log-db-error'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotPosition, RechnungStatus } from '@/lib/types'

export type RechnungKorrekturModus = 'direkt' | 'storno_neu' | 'gesperrt'

/** Filter-/Anzeige-Stufen einer laufenden Rechnungskorrektur. */
export type RechnungKorrekturFilterKey =
  | 'korrektur_entwurf'
  | 'korrektur_gespeichert'
  | 'korrektur_versendet'

export const RECHNUNG_KORREKTUR_FILTER_LABELS: Record<RechnungKorrekturFilterKey, string> = {
  korrektur_entwurf: 'Korrektur Entwurf',
  korrektur_gespeichert: 'Korrektur Gespeichert',
  korrektur_versendet: 'Korrektur Versendet',
}

export const RECHNUNG_KORREKTUR_FILTER_KEYS: RechnungKorrekturFilterKey[] = [
  'korrektur_entwurf',
  'korrektur_gespeichert',
  'korrektur_versendet',
]

export type RechnungKorrekturUiInput = {
  status?: string | null
  korrektur_von?: string | null
  korrektur_art?: string | null
}

export type RechnungKorrekturUi = {
  filterKey: RechnungKorrekturFilterKey | null
  /** Nur bei Korrektur-Entwurf/-Gespeichert: Gesendet + Korrektur-Pill. */
  dualBadges: { primary: string; secondary: string } | null
}

/** Ableitung Anzeige/Filter aus korrektur_von + Status (+ Art). */
export function resolveRechnungKorrekturUi(r: RechnungKorrekturUiInput): RechnungKorrekturUi {
  const von = String(r.korrektur_von ?? '').trim()
  if (!von) return { filterKey: null, dualBadges: null }

  const st = String(r.status ?? '').trim().toLowerCase()
  if (st === 'gesendet' || st === 'bezahlt' || st === 'versendet') {
    return { filterKey: 'korrektur_versendet', dualBadges: null }
  }
  if (st !== 'entwurf') return { filterKey: null, dualBadges: null }

  // DB: korrektur_art nur 'gutschrift' | 'ersetzt' — Entwurf vs. gespeichert über Status
  return {
    filterKey: 'korrektur_entwurf',
    dualBadges: null,
  }
}

/** Status-Filter-Keys einer Listen-Zeile (Korrektur kann zwei Keys matchen). */
export function rechnungStatusFilterKeys(r: RechnungKorrekturUiInput & { unterstatus?: string }): string[] {
  const ui = resolveRechnungKorrekturUi(r)
  if (ui.filterKey === 'korrektur_entwurf' || ui.filterKey === 'korrektur_gespeichert') {
    return [ui.filterKey]
  }
  if (ui.filterKey === 'korrektur_versendet') {
    return ['gesendet', 'korrektur_versendet']
  }
  const u = String(r.unterstatus ?? r.status ?? '').trim().toLowerCase()
  return u ? [u] : []
}

export function matchesRechnungStatusFilterKey(
  r: RechnungKorrekturUiInput & { unterstatus?: string },
  filter: string
): boolean {
  return rechnungStatusFilterKeys(r).includes(filter)
}

/** Nach Storno + neuer RE: Kette setzen (korrektur_von / ersetzt_durch / Art). */
export async function linkRechnungKorrekturKette(
  supabase: {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (cols: string) => PromiseLike<{ error: { message: string } | null }>
        }
      }
    }
  },
  input: {
    originalId: string
    neuId: string
    art: 'gutschrift' | 'ersetzt'
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString()
  const neuRes = await supabase
    .from('rechnungen')
    .update({
      korrektur_von: input.originalId,
      korrektur_art: input.art,
      updated_at: now,
    })
    .eq('id', input.neuId)
    .select('id')
  if (neuRes?.error) {
    console.warn('[linkRechnungKorrekturKette] korrektur_von:', neuRes.error.message)
    return { ok: false, message: neuRes.error.message }
  }
  const origRes = await supabase
    .from('rechnungen')
    .update({ ersetzt_durch: input.neuId, updated_at: now })
    .eq('id', input.originalId)
    .select('id')
  if (origRes?.error) {
    console.warn('[linkRechnungKorrekturKette] ersetzt_durch:', origRes.error.message)
    return { ok: false, message: origRes.error.message }
  }
  return { ok: true }
}

export function rechnungKorrekturModus(status: RechnungStatus | string | null | undefined): RechnungKorrekturModus {
  const s = (status ?? '').toLowerCase()
  if (s === 'entwurf') return 'direkt'
  if (s === 'gesendet' || s === 'bezahlt') return 'storno_neu'
  return 'gesperrt'
}

/** Snapshot der belegrelevanten Felder — Diff entscheidet über Storno-Gutschrift.
 *
 * Korrektur MIT Storno (gesendet/bezahlt + Diff): Positionen, Steuer, Daten,
 * PDF-Texte, Ansprechpartner (Empfängerblock), Objekt/Leistungsort.
 * Nur Korrektur OHNE Storno: Mail-Betreff/-Einleitung, Fälligkeit, Zahlungsbedingungen
 * (nicht in diesem Fingerprint → Update am Original).
 */
export type RechnungMaterialSnapshot = {
  positionen: AngebotPosition[] | unknown
  reverse_charge_13b?: boolean | null
  hinweis_35a?: boolean | null
  rechnungsdatum?: string | null
  leistungszeitraum_von?: string | null
  leistungszeitraum_bis?: string | null
  faellig_am?: string | null
  zahlungsbedingungen?: string | null
  einleitung?: string | null
  hinweise?: string | null
  /** Empfänger / Adressblock — Änderung an gesendeter RE → Storno + neu. */
  ansprechpartner_id?: string | null
  kunde_objekt_id?: string | null
}

function normText(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ')
}

function positionenFinger(positionen: AngebotPosition[] | unknown): unknown {
  return normalizeAngebotPositionen((positionen as AngebotPosition[]) ?? []).map((p) => ({
    leistung: normText(p.leistung),
    beschreibung: normText(p.beschreibung),
    menge: Number(p.menge) || 0,
    einheit: normText(p.einheit),
    lohn_netto: Number(p.lohn_netto) || 0,
    material_netto: Number(p.material_netto) || 0,
    vk_netto: Number(p.vk_netto) || 0,
    gesamt_min: Number(p.gesamt_min) || 0,
    gesamt_max: Number(p.gesamt_max) || 0,
    mwst_satz: p.mwst_satz ?? null,
    gewerk_slug: normText(p.gewerk_slug ?? p.gewerk_id),
  }))
}

export function rechnungMaterialFingerprint(s: RechnungMaterialSnapshot): string {
  return JSON.stringify({
    positionen: positionenFinger(s.positionen),
    reverse_charge_13b: Boolean(s.reverse_charge_13b),
    hinweis_35a: Boolean(s.hinweis_35a),
    rechnungsdatum: normText(s.rechnungsdatum).slice(0, 10),
    leistungszeitraum_von: normText(s.leistungszeitraum_von).slice(0, 10),
    leistungszeitraum_bis: normText(s.leistungszeitraum_bis).slice(0, 10),
    einleitung: normText(s.einleitung),
    hinweise: normText(s.hinweise),
    ansprechpartner_id: normText(s.ansprechpartner_id),
    kunde_objekt_id: normText(s.kunde_objekt_id),
  })
}

export function rechnungMaterialGeaendert(
  vorher: RechnungMaterialSnapshot,
  nachher: RechnungMaterialSnapshot
): boolean {
  return rechnungMaterialFingerprint(vorher) !== rechnungMaterialFingerprint(nachher)
}

/** Gesendet/bezahlt + materielle Änderung → Storno-Gutschrift + neue RE. */
export function rechnungBrauchtStornoBeiAenderung(
  status: RechnungStatus | string | null | undefined,
  vorher: RechnungMaterialSnapshot,
  nachher: RechnungMaterialSnapshot
): boolean {
  const modus = rechnungKorrekturModus(status)
  if (modus !== 'storno_neu') return false
  return rechnungMaterialGeaendert(vorher, nachher)
}

export function rechnungDarfHardGeloeschtWerden(status: RechnungStatus | string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'entwurf'
}

/** Soft-Storno ohne Ersatz — nur gesendet, nicht bezahlt. */
export function rechnungDarfOhneErsatzStorniertWerden(
  status: RechnungStatus | string | null | undefined
): boolean {
  return (status ?? '').toLowerCase() === 'gesendet'
}

export type RechnungKorrekturSibling = {
  id: string
  created_at?: string | null
  status?: string | null
  beleg_typ?: string | null
  zahlungsplan_abschlag_id?: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  bezug_rechnung_id?: string | null
  korrektur_von?: string | null
  ersetzt_durch?: string | null
  rechnungsnummer?: string | null
  brutto?: number | null
}

/** Ob zur Rechnung bereits eine Storno-Gutschrift (mit Bezug) existiert. */
export function hatStornoGutschriftZuRechnung(
  rechnungId: string,
  siblings: RechnungKorrekturSibling[]
): boolean {
  return siblings.some(
    (s) =>
      String(s.beleg_typ ?? '') === 'gutschrift' &&
      String(s.bezug_rechnung_id ?? '') === rechnungId
  )
}

/** Gutschrift-ID zur Original-RE (neueste Entwurf/gesendet). */
export function findeStornoGutschriftId(
  originalRechnungId: string,
  siblings: Array<{
    id: string
    beleg_typ?: string | null
    bezug_rechnung_id?: string | null
    status?: string | null
    created_at?: string | null
  }>
): string | null {
  const orig = String(originalRechnungId ?? '').trim()
  if (!orig) return null
  const candidates = siblings.filter((s) => {
    if (String(s.beleg_typ ?? '') !== 'gutschrift') return false
    if (String(s.bezug_rechnung_id ?? '').trim() !== orig) return false
    const st = String(s.status ?? '').toLowerCase()
    return st === 'entwurf' || st === 'gesendet' || st === 'versendet'
  })
  candidates.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
  return candidates[0]?.id ?? null
}

/**
 * Korrektur-Kette: neue RE ↔ Original ↔ Storno-Gutschrift.
 * `mitStorno` = Ersatz nach materieller Änderung (Gutschrift erwartet).
 */
export type RechnungKorrekturKette = {
  neuId: string
  originalId: string | null
  gutschriftId: string | null
  mitStorno: boolean
  korrekturArt: string | null
}

export function resolveRechnungKorrekturKette(input: {
  neuId: string
  korrektur_von?: string | null
  korrektur_art?: string | null
  /** Siblings derselben Kunde/Auftrag-Gruppe (mind. Gutschriften + ggf. Original). */
  siblings?: Array<{
    id: string
    beleg_typ?: string | null
    bezug_rechnung_id?: string | null
    status?: string | null
    created_at?: string | null
    ersetzt_durch?: string | null
  }>
}): RechnungKorrekturKette {
  const neuId = String(input.neuId ?? '').trim()
  const originalId = String(input.korrektur_von ?? '').trim() || null
  const art = String(input.korrektur_art ?? '').trim().toLowerCase() || null
  const siblings = input.siblings ?? []

  let resolvedOriginal = originalId
  if (!resolvedOriginal) {
    // Verzögerter Storno: Original kann noch gesendet/bezahlt sein, ersetzt_durch zeigt schon auf neu
    const viaErsetzt = siblings.find(
      (s) => String(s.ersetzt_durch ?? '').trim() === neuId
    )
    resolvedOriginal = viaErsetzt?.id ?? null
  }

  const gutschriftId = resolvedOriginal
    ? findeStornoGutschriftId(resolvedOriginal, siblings)
    : null

  // korrektur_von existiert nur nach materieller Korrektur (Storno + neue RE)
  const mitStorno = Boolean(resolvedOriginal)

  return {
    neuId,
    originalId: resolvedOriginal,
    gutschriftId,
    mitStorno,
    korrekturArt: art,
  }
}

/**
 * Soft-Storno darf zurückgenommen werden, wenn storniert und keine Gutschrift mit Bezug existiert.
 */
export function rechnungDarfStornoZurueckgenommenWerden(
  status: RechnungStatus | string | null | undefined,
  rechnungId: string,
  siblings: RechnungKorrekturSibling[]
): boolean {
  if ((status ?? '').toLowerCase() !== 'storniert') return false
  return !hatStornoGutschriftZuRechnung(rechnungId, siblings)
}

/** Nachfolger-RE nach Korrektur (Storno + neue Nr.). */
export function findeNachfolgerRechnungId(
  original: {
    id: string
    created_at?: string | null
    zahlungsplan_abschlag_id?: string | null
    rechnung_art?: string | null
    abschlag_index?: number | null
  },
  siblings: RechnungKorrekturSibling[]
): string | null {
  const origTs = original.created_at ? new Date(original.created_at).getTime() : 0
  const abOrig = String(original.zahlungsplan_abschlag_id ?? '').trim() || null
  const artOrig = String(original.rechnung_art ?? 'voll')
  const idxOrig = original.abschlag_index ?? null

  const candidates = siblings.filter((s) => {
    if (s.id === original.id) return false
    if (String(s.beleg_typ ?? 'rechnung') === 'gutschrift') return false
    if (String(s.status ?? '') === 'storniert') return false
    const sTs = s.created_at ? new Date(s.created_at).getTime() : 0
    if (sTs <= origTs) return false
    const abS = String(s.zahlungsplan_abschlag_id ?? '').trim() || null
    if (abOrig || abS) return abOrig === abS
    return (
      String(s.rechnung_art ?? 'voll') === artOrig && (s.abschlag_index ?? null) === idxOrig
    )
  })

  candidates.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta - tb
  })
  return candidates[0]?.id ?? null
}

/** Inverse: Original-ID für Korrektur-Entwurf ohne gesetztes korrektur_von (Legacy-Daten). */
export function findeKorrekturOriginalId(
  neu: {
    id: string
    created_at?: string | null
    zahlungsplan_abschlag_id?: string | null
    rechnung_art?: string | null
    abschlag_index?: number | null
  },
  siblings: RechnungKorrekturSibling[]
): string | null {
  const neuTs = neu.created_at ? new Date(neu.created_at).getTime() : 0
  const abNeu = String(neu.zahlungsplan_abschlag_id ?? '').trim() || null
  const artNeu = String(neu.rechnung_art ?? 'voll')
  const idxNeu = neu.abschlag_index ?? null

  const candidates = siblings.filter((s) => {
    if (s.id === neu.id) return false
    if (String(s.beleg_typ ?? 'rechnung') === 'gutschrift') return false
    // Verzögerter Storno: Original noch gesendet/bezahlt, aber ersetzt_durch = neu
    if (String(s.ersetzt_durch ?? '').trim() === neu.id) return true
    if (String(s.status ?? '') !== 'storniert') return false
    const sTs = s.created_at ? new Date(s.created_at).getTime() : 0
    if (sTs >= neuTs) return false
    const abS = String(s.zahlungsplan_abschlag_id ?? '').trim() || null
    if (abNeu || abS) return abNeu === abS
    return (
      String(s.rechnung_art ?? 'voll') === artNeu && (s.abschlag_index ?? null) === idxNeu
    )
  })

  candidates.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
  return candidates[0]?.id ?? null
}

export type RechnungKorrekturKetteMemberRole = 'original' | 'gutschrift' | 'neu'

export type RechnungKorrekturKetteMember = {
  id: string
  role: RechnungKorrekturKetteMemberRole
  /** 0 = erste Korrektur-Welle (Original), 1 = Korrektur der Korrektur, … */
  wave: number
  rechnungsnummer: string | null
  status: string
  brutto: number | null
  beleg_typ: string | null
  current: boolean
}

export type RechnungKorrekturKetteUi = {
  pending: boolean
  members: RechnungKorrekturKetteMember[]
}

export type RechnungKorrekturKetteSiblingRow = {
  id: string
  status?: string | null
  beleg_typ?: string | null
  bezug_rechnung_id?: string | null
  korrektur_von?: string | null
  ersetzt_durch?: string | null
  rechnungsnummer?: string | null
  brutto?: number | null
  created_at?: string | null
}

function isGutschriftRow(row: { beleg_typ?: string | null } | undefined): boolean {
  return String(row?.beleg_typ ?? 'rechnung').toLowerCase() === 'gutschrift'
}

/** Wurzel der Korrektur-Familie (erste Original-RE). */
export function resolveKorrekturKetteRootId(
  startId: string,
  byId: Map<string, RechnungKorrekturKetteSiblingRow>
): string {
  let cur = startId
  const seen = new Set<string>()
  for (let i = 0; i < 24; i++) {
    if (seen.has(cur)) break
    seen.add(cur)
    const row = byId.get(cur)
    if (!row) break
    if (isGutschriftRow(row)) {
      const bezug = String(row.bezug_rechnung_id ?? '').trim()
      if (bezug) {
        cur = bezug
        continue
      }
      break
    }
    const von = String(row.korrektur_von ?? '').trim()
    if (von) {
      cur = von
      continue
    }
    break
  }
  return cur
}

function findNachfolgerId(
  rechnungId: string,
  byId: Map<string, RechnungKorrekturKetteSiblingRow>,
  siblings: RechnungKorrekturKetteSiblingRow[]
): string | null {
  const row = byId.get(rechnungId)
  const ersetzt = String(row?.ersetzt_durch ?? '').trim()
  if (ersetzt) return ersetzt
  const via = siblings.find(
    (s) =>
      String(s.korrektur_von ?? '').trim() === rechnungId && !isGutschriftRow(s)
  )
  return via?.id ?? null
}

/**
 * Baut die sichtbare Korrektur-Kette für Detail-UI aus aktueller RE + Sibling-Zeilen.
 * Mehrstufig: Original → Storno → Korrektur → (nochmals) Storno → Korrektur …
 */
export function buildRechnungKorrekturKetteUi(
  current: {
    id: string
    status?: string | null
    beleg_typ?: string | null
    bezug_rechnung_id?: string | null
    korrektur_von?: string | null
    ersetzt_durch?: string | null
    rechnungsnummer?: string | null
    brutto?: number | null
  },
  siblings: RechnungKorrekturKetteSiblingRow[]
): RechnungKorrekturKetteUi | null {
  const byId = new Map<string, RechnungKorrekturKetteSiblingRow>()
  for (const s of siblings) byId.set(s.id, s)
  byId.set(current.id, { ...current, id: current.id })

  const hasLink =
    Boolean(String(current.korrektur_von ?? '').trim()) ||
    Boolean(String(current.ersetzt_durch ?? '').trim()) ||
    isGutschriftRow(current) ||
    siblings.some(
      (s) =>
        String(s.korrektur_von ?? '').trim() === current.id ||
        String(s.ersetzt_durch ?? '').trim() === current.id ||
        (isGutschriftRow(s) && String(s.bezug_rechnung_id ?? '').trim() === current.id)
    )
  if (!hasLink) return null

  const rootId = resolveKorrekturKetteRootId(current.id, byId)
  const memberIds: Array<{ id: string; role: RechnungKorrekturKetteMemberRole; wave: number }> =
    []
  let curId: string | null = rootId
  let wave = 0
  const seen = new Set<string>()

  while (curId && !seen.has(curId)) {
    seen.add(curId)
    memberIds.push({
      id: curId,
      role: wave === 0 ? 'original' : 'neu',
      wave,
    })
    const gsId = findeStornoGutschriftId(curId, siblings)
    if (gsId && !seen.has(gsId)) {
      memberIds.push({ id: gsId, role: 'gutschrift', wave })
    }
    const next = findNachfolgerId(curId, byId, siblings)
    if (!next || next === curId) break
    curId = next
    wave += 1
  }

  if (memberIds.length < 2) return null

  const members: RechnungKorrekturKetteMember[] = memberIds.map(({ id, role, wave: w }) => {
    const row = byId.get(id)
    return {
      id,
      role,
      wave: w,
      rechnungsnummer: row?.rechnungsnummer?.trim() || null,
      status: String(row?.status ?? 'entwurf'),
      brutto: row?.brutto ?? null,
      beleg_typ: row?.beleg_typ ?? null,
      current: id === current.id,
    }
  })

  const pending = members.some((m) => m.status.toLowerCase() === 'entwurf')

  return { pending, members }
}

export function korrekturKetteMemberRoleLabel(
  role: RechnungKorrekturKetteMemberRole,
  wave = 0
): string {
  if (role === 'original') return 'Original'
  if (role === 'gutschrift') {
    return wave > 0 ? `Storno ${wave + 1}` : 'Storno'
  }
  if (wave <= 1) return 'Korrektur'
  return `Korrektur ${wave}`
}


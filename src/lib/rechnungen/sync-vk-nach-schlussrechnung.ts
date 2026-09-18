/**
 * Schlussrechnung teurer als Auftragssumme → Auftrag + verknüpftes Angebot
 * still anheben (nur hoch, nie runter; keine Positionen löschen).
 */
import 'server-only'

import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { angebotPositionenToAuftragRows } from '@/lib/auftrag-positionen-map'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'
import {
  auftragSummenAusPositionen,
  istAbschlagPauschalPosition,
  summeGestellteRechnungenBrutto,
  type RechnungAbschlagLink,
} from '@/lib/rechnungen/zahlungsplan'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'

function normKey(s: string): string {
  return s.trim().toLowerCase()
}

function posKey(p: Pick<AngebotPosition, 'leistung' | 'leistung_name' | 'gewerk_slug' | 'gewerk_name'>): string {
  const leistung = normKey(String(p.leistung_name || p.leistung || ''))
  const gw = normKey(String(p.gewerk_slug || p.gewerk_name || ''))
  return `${gw}::${leistung}`
}

function filterLeistungsPositionen(positionen: AngebotPosition[]): AngebotPosition[] {
  return normalizeAngebotPositionen(positionen).filter(
    (p) => !istGewerkBeschreibungPosition(p) && !istAbschlagPauschalPosition(p)
  )
}

function deltaAnpassungPos(deltaNetto: number): AngebotPosition {
  const n = Math.round(Math.max(0, deltaNetto) * 100) / 100
  return {
    id: crypto.randomUUID(),
    gewerk_id: '',
    gewerk_slug: 'sonstiges',
    gewerk_name: 'Sonstiges',
    leistung: 'Anpassung Endabrechnung',
    leistung_name: 'Anpassung Endabrechnung',
    beschreibung: 'Automatisch aus Schlussrechnung — Auftragssumme an Rechnungsbetrag angeglichen.',
    lohn_netto: n,
    material_netto: 0,
    vk_netto: n,
    gesamt_min: n,
    gesamt_max: n,
    menge: 1,
    einheit: 'pauschal',
    position_quelle: 'frei',
  }
}

async function loadAuftragVkNetto(auftragId: string): Promise<{
  vkNetto: number
  angebotId: string | null
  auftragPos: AuftragPosition[]
}> {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('angebot_id, auftrag_positionen(*)')
    .eq('id', auftragId)
    .maybeSingle()

  const auftragPos = ((auf as { auftrag_positionen?: AuftragPosition[] } | null)?.auftrag_positionen ??
    []) as AuftragPosition[]
  const angebotId =
    ((auf as { angebot_id?: string | null } | null)?.angebot_id ?? null)?.trim() || null

  if (auftragPos.length > 0) {
    const asAng = auftragPositionenToAngebotPositionen(auftragPos)
    return { vkNetto: auftragSummenAusPositionen(asAng).netto, angebotId, auftragPos }
  }

  if (angebotId) {
    const { data: ang } = await supabaseAdmin
      .from('angebote')
      .select('positionen')
      .eq('id', angebotId)
      .maybeSingle()
    const pos = normalizeAngebotPositionen(ang?.positionen)
    return { vkNetto: auftragSummenAusPositionen(pos).netto, angebotId, auftragPos }
  }

  return { vkNetto: 0, angebotId: null, auftragPos }
}

async function appendOrUpdateAuftragPositionen(
  auftragId: string,
  pool: AuftragPosition[],
  fromWizard: AngebotPosition[]
): Promise<void> {
  const maxSort = pool.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0)
  let sortCursor = maxSort + 10
  const used = new Set<string>()

  for (const angPos of fromWizard) {
    const rows = angebotPositionenToAuftragRows(auftragId, [angPos])
    const row = rows[0]
    if (!row) continue

    const key = posKey(angPos)
    const match = pool.find((p) => {
      if (used.has(p.id)) return false
      return (
        posKey({
          leistung: p.leistung_name,
          leistung_name: p.leistung_name,
          gewerk_slug: p.gewerk_slug ?? undefined,
          gewerk_name: p.gewerk_name,
        }) === key
      )
    })

    if (match?.id) {
      used.add(match.id)
      await supabaseAdmin
        .from('auftrag_positionen')
        .update({
          menge: row.menge,
          preis_fix: row.preis_fix,
          lohn_fix: row.lohn_fix,
          material_fix: row.material_fix,
          beschreibung: row.beschreibung,
          einheit: row.einheit,
          aenderung_typ: null,
        })
        .eq('id', match.id)
      continue
    }

    const { data: inserted } = await supabaseAdmin
      .from('auftrag_positionen')
      .insert({
        ...row,
        sort_order: sortCursor,
        aenderung_typ: 'neu',
      })
      .select('id')
      .maybeSingle()
    sortCursor += 10
    if (inserted?.id) {
      pool.push({
        id: String(inserted.id),
        auftrag_id: auftragId,
        leistung_name: row.leistung_name,
        gewerk_name: row.gewerk_name,
        gewerk_slug: row.gewerk_slug,
        sort_order: sortCursor,
      } as AuftragPosition)
    }
  }
}

async function mergeAngebotPositionen(
  angebotId: string,
  fromWizard: AngebotPosition[]
): Promise<void> {
  const { data: ang } = await supabaseAdmin
    .from('angebote')
    .select('positionen')
    .eq('id', angebotId)
    .maybeSingle()
  if (!ang) return

  const existing = normalizeAngebotPositionen(ang.positionen)
  const byKey = new Map(existing.map((p) => [posKey(p), p]))

  for (const w of fromWizard) {
    const k = posKey(w)
    const prev = byKey.get(k)
    if (prev) {
      byKey.set(k, {
        ...prev,
        menge: w.menge,
        lohn_netto: w.lohn_netto,
        material_netto: w.material_netto,
        vk_netto: w.vk_netto ?? w.gesamt_min,
        gesamt_min: w.gesamt_min,
        gesamt_max: w.gesamt_max,
        beschreibung: w.beschreibung || prev.beschreibung,
        einheit: w.einheit || prev.einheit,
      })
    } else {
      byKey.set(k, { ...w, id: w.id?.trim() || crypto.randomUUID() })
    }
  }

  const next = Array.from(byKey.values())
  await supabaseAdmin.from('angebote').update({ positionen: next }).eq('id', angebotId)
}

/**
 * Nur aufrufen, wenn Schlussrechnung + gestellte Raten die Auftragssumme übersteigen würden.
 * Hebt Auftrag (und Angebot) an — löscht nichts, senkt nichts.
 */
export async function raiseAuftragVkFuerSchlussrechnung(input: {
  auftragId: string
  wizardPositionen: AngebotPosition[]
  bestehende: RechnungAbschlagLink[]
  neueNetto: number
  ausserRechnungId?: string | null
  mwstSatz?: number
}): Promise<{ ok: true; vkNetto: number; adjusted: boolean } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  if (!auftragId) return { ok: false, message: 'Auftrag fehlt.' }

  const mwst = input.mwstSatz ?? 19
  const ratio = 1 + mwst / 100
  const bereits = summeGestellteRechnungenBrutto(input.bestehende, input.ausserRechnungId)
  const neueBrutto = Math.round(Math.max(0, input.neueNetto) * ratio * 100) / 100
  const neededVkBrutto = Math.round((bereits + neueBrutto) * 100) / 100
  const neededVkNetto = Math.round((neededVkBrutto / ratio) * 100) / 100

  let { vkNetto, angebotId, auftragPos } = await loadAuftragVkNetto(auftragId)
  const vkBrutto = Math.round(Math.max(0, vkNetto) * ratio * 100) / 100
  if (neededVkBrutto <= vkBrutto + 0.5) {
    return { ok: true, vkNetto, adjusted: false }
  }

  const fromWizard = filterLeistungsPositionen(input.wizardPositionen)
  if (fromWizard.length) {
    await appendOrUpdateAuftragPositionen(auftragId, auftragPos, fromWizard)
    if (angebotId) await mergeAngebotPositionen(angebotId, fromWizard)
  }

  ;({ vkNetto, angebotId, auftragPos } = await loadAuftragVkNetto(auftragId))
  if (vkNetto + 0.01 < neededVkNetto) {
    const delta = Math.round((neededVkNetto - vkNetto) * 100) / 100
    if (delta > 0.5) {
      const deltaPos = deltaAnpassungPos(delta)
      await appendOrUpdateAuftragPositionen(auftragId, auftragPos, [deltaPos])
      if (angebotId) await mergeAngebotPositionen(angebotId, [deltaPos])
      vkNetto = Math.round((vkNetto + delta) * 100) / 100
    }
  }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz_intern',
    titel: 'Auftragssumme an Endabrechnung angepasst',
    beschreibung:
      'Schlussrechnung lag über der bisherigen Auftragssumme — Auftrag und Angebot wurden automatisch angehoben.',
  })

  return { ok: true, vkNetto, adjusted: true }
}

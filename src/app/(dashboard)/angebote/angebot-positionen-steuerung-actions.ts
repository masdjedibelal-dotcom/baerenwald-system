'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  normalizeAngebotPositionen,
  neuePositionsId,
  summenAusPositionen,
} from '@/lib/angebot-positionen'
import { splitNettoStueck, type KostenVerteilung } from '@/lib/angebot-kosten-split'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { angebotDarfImWizardBearbeitetWerden } from '@/lib/angebote/angebot-wizard-types'
import {
  resolveGewerkForAngebotPositionen,
} from '@/lib/angebote/resolve-position-gewerk'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { syncAngebotPositionenZuAuftrag } from '@/lib/auftraege/sync-angebot-zu-auftrag'
import { istFreitextPosition, istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import type { AngebotPosition } from '@/lib/types'

async function assertAngebotEditable(angebotId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', supabase: null }

  const { data, error } = await supabase
    .from('angebote')
    .select('id, status, positionen')
    .eq('id', angebotId)
    .maybeSingle()

  if (error || !data) return { ok: false as const, message: 'Angebot nicht gefunden', supabase: null }
  if (!angebotDarfImWizardBearbeitetWerden(String(data.status))) {
    return { ok: false as const, message: 'Dieses Angebot kann nicht mehr bearbeitet werden.', supabase: null }
  }

  return {
    ok: true as const,
    supabase,
    positionen: normalizeAngebotPositionen(data.positionen),
  }
}

function insertIndexForBlock(positionen: AngebotPosition[], blockKey: string | null | undefined): number {
  const key = blockKey?.trim()
  if (!key) return positionen.length
  let lastIdx = -1
  for (let i = 0; i < positionen.length; i++) {
    const p = positionen[i]!
    const pk = p.gewerk_block_key?.trim() || p.gewerk_id?.trim() || p.gewerk_slug?.trim() || ''
    if (pk === key) lastIdx = i
  }
  return lastIdx >= 0 ? lastIdx + 1 : positionen.length
}

function vkLineFromInput(
  vkNetto: number,
  menge: number,
  kostenverteilung: KostenVerteilung = 'allgemein'
): { lohn_netto: number; material_netto: number; gesamt_min: number; gesamt_max: number } {
  const m = Math.max(menge, 0.0001)
  const line = Math.round(Math.max(vkNetto, 0) * 100) / 100
  const stueck = Math.round((line / m) * 100) / 100
  const { lohn_netto, material_netto } = splitNettoStueck(stueck, {
    firm: defaultFirmenEinstellungen(),
    kostenverteilung,
  })
  return {
    lohn_netto,
    material_netto,
    gesamt_min: line,
    gesamt_max: line,
  }
}

function ekStueckFromInput(ekNetto: number | null | undefined, menge: number): number | undefined {
  if (ekNetto == null || !Number.isFinite(ekNetto) || ekNetto < 0) return undefined
  const m = Math.max(menge, 0.0001)
  return Math.round((ekNetto / m) * 100) / 100
}

async function persistAngebotPositionen(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  angebotId: string,
  positionen: AngebotPosition[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeAngebotPositionen(positionen)
  const summen = summenAusPositionen(normalized, 19)

  const { error } = await supabase
    .from('angebote')
    .update({
      positionen: normalized,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (error) return { ok: false, message: error.message }

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('id')
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (auftrag?.id) {
    const { data: angebotHw } = await supabaseAdmin
      .from('angebote')
      .select('angebot_handwerker(*)')
      .eq('id', angebotId)
      .maybeSingle()

    const sync = await syncAngebotPositionenZuAuftrag({
      auftragId: String(auftrag.id),
      angebotPositionen: normalized,
      angebotHandwerker: angebotHw?.angebot_handwerker ?? [],
    })
    if (!sync.ok) return sync
    revalidatePath(`/auftraege/${auftrag.id}`)
  }

  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/angebote')
  return { ok: true }
}

export async function updateAngebotPositionSteuerung(
  angebotId: string,
  positionId: string,
  data: {
    leistung_name?: string
    beschreibung?: string | null
    vk_netto?: number | null
    ek_netto?: number | null
    menge?: number | null
    einheit?: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAngebotEditable(angebotId)
  if (!gate.ok) return gate

  const id = positionId.trim()
  const idx = gate.positionen.findIndex((p) => p.id === id)
  if (idx < 0) return { ok: false, message: 'Position nicht gefunden.' }

  const current = gate.positionen[idx]!
  if (istGewerkBeschreibungPosition(current) || istFreitextPosition(current)) {
    return { ok: false, message: 'Diese Position kann hier nicht bearbeitet werden.' }
  }

  const menge =
    data.menge != null && Number.isFinite(data.menge) && data.menge > 0
      ? data.menge
      : current.menge || 1
  const einheit = data.einheit?.trim() || current.einheit || 'Stk.'
  const leistung =
    data.leistung_name !== undefined ? data.leistung_name.trim() : current.leistung_name || current.leistung
  if (!leistung) return { ok: false, message: 'Bezeichnung ist erforderlich.' }

  const vkLine =
    data.vk_netto != null && Number.isFinite(data.vk_netto)
      ? Math.max(0, data.vk_netto)
      : (current.lohn_netto + current.material_netto) * menge
  const kostenverteilung: KostenVerteilung =
    current.kostenverteilung === 'lohn' ||
    current.kostenverteilung === 'material' ||
    current.kostenverteilung === 'allgemein'
      ? current.kostenverteilung
      : 'allgemein'
  const vkParts = vkLineFromInput(vkLine, menge, kostenverteilung)

  const ekInput =
    data.ek_netto !== undefined
      ? data.ek_netto != null && Number.isFinite(data.ek_netto) && data.ek_netto >= 0
        ? data.ek_netto
        : null
      : current.einkaufspreis != null
        ? current.einkaufspreis * (current.menge || 1)
        : null
  const einkaufspreis = ekStueckFromInput(ekInput, menge)

  const updated: AngebotPosition = {
    ...current,
    leistung,
    leistung_name: leistung,
    beschreibung: data.beschreibung !== undefined ? (data.beschreibung?.trim() ?? '') : current.beschreibung,
    menge,
    einheit,
    lohn_netto: vkParts.lohn_netto,
    material_netto: vkParts.material_netto,
    gesamt_min: vkParts.gesamt_min,
    gesamt_max: vkParts.gesamt_max,
    preis_typ: 'fix',
    einkaufspreis,
  }

  const next = [...gate.positionen]
  next[idx] = updated
  return persistAngebotPositionen(gate.supabase!, angebotId, next)
}

export async function addAngebotPosition(
  angebotId: string,
  data: {
    leistung_name: string
    gewerk_id: string
    gewerk_name: string
    gewerk_slug: string
    gewerk_block_key?: string | null
    beschreibung?: string | null
    vk_netto: number
    ek_netto?: number | null
    menge?: number | null
    einheit?: string | null
    kostenverteilung?: KostenVerteilung | null
  }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertAngebotEditable(angebotId)
  if (!gate.ok) return gate

  const leistung = data.leistung_name.trim()
  if (!leistung) return { ok: false, message: 'Bezeichnung ist erforderlich.' }
  if (!data.gewerk_slug.trim()) return { ok: false, message: 'Gewerk ist erforderlich.' }
  if (!data.gewerk_name.trim()) return { ok: false, message: 'Gewerk-Name ist erforderlich.' }

  const vkNum = Number(data.vk_netto)
  if (!Number.isFinite(vkNum) || vkNum <= 0) {
    return { ok: false, message: 'VK netto ist erforderlich.' }
  }

  const kostenverteilung: KostenVerteilung =
    data.kostenverteilung === 'lohn' ||
    data.kostenverteilung === 'material' ||
    data.kostenverteilung === 'allgemein'
      ? data.kostenverteilung
      : 'allgemein'

  const menge = data.menge != null && Number.isFinite(data.menge) && data.menge > 0 ? data.menge : 1
  const vkParts = vkLineFromInput(vkNum, menge, kostenverteilung)
  const einkaufspreis = ekStueckFromInput(data.ek_netto, menge)
  const blockKey = data.gewerk_block_key?.trim() || `${data.gewerk_slug}-${Date.now()}`
  const id = neuePositionsId()

  const neu: AngebotPosition = {
    id,
    gewerk_id: data.gewerk_id,
    gewerk_name: data.gewerk_name.trim(),
    gewerk_slug: data.gewerk_slug.trim(),
    gewerk_block_key: blockKey,
    leistung,
    leistung_name: leistung,
    beschreibung: data.beschreibung?.trim() ?? '',
    menge,
    einheit: data.einheit?.trim() || 'Stk.',
    lohn_netto: vkParts.lohn_netto,
    material_netto: vkParts.material_netto,
    gesamt_min: vkParts.gesamt_min,
    gesamt_max: vkParts.gesamt_max,
    preis_typ: 'fix',
    einkaufspreis,
    kostenverteilung,
  }

  const next = [...gate.positionen]
  const insertAt = insertIndexForBlock(next, blockKey)
  next.splice(insertAt, 0, neu)

  const saved = await persistAngebotPositionen(gate.supabase!, angebotId, next)
  if (!saved.ok) return saved
  return { ok: true, id }
}

/** PosBoard / Mock: gesamtes Positions-Array ersetzen (Autosave). */
export async function replaceAngebotPositionen(
  angebotId: string,
  positionen: AngebotPosition[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAngebotEditable(angebotId)
  if (!gate.ok) return gate
  return persistAngebotPositionen(gate.supabase!, angebotId, positionen)
}

export async function bulkDeleteAngebotPositionen(
  angebotId: string,
  positionIds: string[]
): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
  const gate = await assertAngebotEditable(angebotId)
  if (!gate.ok) return gate

  const ids = new Set(positionIds.map((id) => id.trim()).filter(Boolean))
  if (!ids.size) return { ok: false, message: 'Keine Positionen ausgewählt.' }

  let deleted = 0
  const next = gate.positionen.filter((p) => {
    if (!ids.has(p.id)) return true
    if (istGewerkBeschreibungPosition(p)) return true
    deleted++
    return false
  })

  if (!deleted) return { ok: false, message: 'Keine löschbaren Positionen gefunden.' }

  const saved = await persistAngebotPositionen(gate.supabase!, angebotId, next)
  if (!saved.ok) return saved
  return { ok: true, deleted }
}

/**
 * Handwerker an Angebots-Positionen zuweisen (Partner-EK + angebot_handwerker),
 * analog zu Auftrag `zuweiseHandwerkerAnPositionenV3`.
 */
export async function zuweiseHandwerkerAnAngebotPositionen(input: {
  angebotId: string
  positionIds: string[]
  handwerkerId: string
  ekNetto?: number | null
  ekNettoByPositionId?: Record<string, number | null | undefined>
  leistung_name?: string
  beschreibung?: string | null
  aufgabe_notiz?: string | null
}): Promise<{ ok: true; updated: number; zuweisungIds: string[] } | { ok: false; message: string }> {
  const gate = await assertAngebotEditable(input.angebotId)
  if (!gate.ok) return gate

  const ids = Array.from(new Set(input.positionIds.map((id) => id.trim()).filter(Boolean)))
  const hwId = input.handwerkerId.trim()
  if (!ids.length || !hwId) {
    return { ok: false, message: 'Positionen und Handwerker erforderlich.' }
  }

  const { data: hw, error: hwErr } = await gate.supabase!
    .from('handwerker')
    .select('id, name, firma')
    .eq('id', hwId)
    .maybeSingle()
  if (hwErr || !hw) return { ok: false, message: 'Handwerker nicht gefunden.' }

  const hwName =
    (hw.firma as string | null)?.trim() ||
    (hw.name as string | null)?.trim() ||
    'Handwerker'

  const ekGlobal =
    input.ekNetto != null && Number.isFinite(input.ekNetto) && input.ekNetto >= 0
      ? Math.round(input.ekNetto * 100) / 100
      : null
  const ekById = input.ekNettoByPositionId ?? null

  const gewerke = await loadGewerkeAusfuehrung(gate.supabase!)
  const positionenResolved = await resolveGewerkForAngebotPositionen(
    gate.supabase!,
    gate.positionen,
    gewerke
  )

  const next = [...positionenResolved]
  let updated = 0
  const gewerkIds = new Set<string>()

  for (const posId of ids) {
    const idx = next.findIndex((p) => p.id === posId)
    if (idx < 0) return { ok: false, message: 'Position nicht gefunden.' }
    const current = next[idx]!
    if (istGewerkBeschreibungPosition(current) || istFreitextPosition(current)) {
      return { ok: false, message: 'Diese Position kann hier nicht zugewiesen werden.' }
    }

    const menge =
      current.menge != null && Number.isFinite(current.menge) && current.menge > 0
        ? current.menge
        : 1
    const fromMap = ekById?.[posId]
    const ekLine =
      fromMap != null && Number.isFinite(fromMap) && fromMap >= 0
        ? Math.round(fromMap * 100) / 100
        : ekGlobal
    if (ekLine == null || ekLine < 0) {
      return {
        ok: false,
        message: `Partner-EK fehlt für „${current.leistung_name?.trim() || current.leistung || 'Leistung'}“.`,
      }
    }

    const leistung =
      ids.length === 1 && input.leistung_name !== undefined
        ? input.leistung_name.trim() || current.leistung_name || current.leistung
        : current.leistung_name || current.leistung
    const beschreibung =
      ids.length === 1 && input.beschreibung !== undefined
        ? input.beschreibung?.trim() ?? ''
        : current.beschreibung

    next[idx] = {
      ...current,
      leistung,
      leistung_name: leistung,
      beschreibung,
      handwerker_id: hwId,
      handwerker_name: hwName,
      einkaufspreis: ekStueckFromInput(ekLine, menge),
    }
    updated++

    const gid = next[idx]!.gewerk_id?.trim()
    if (!gid) {
      return {
        ok: false,
        message: `„${leistung || 'Leistung'}“ hat kein Gewerk — Zuweisung nicht möglich.`,
      }
    }
    gewerkIds.add(gid)
  }

  const saved = await persistAngebotPositionen(gate.supabase!, input.angebotId, next)
  if (!saved.ok) return saved

  const notiz = input.aufgabe_notiz?.trim() || null
  const zuweisungIds: string[] = []

  for (const gewerkId of gewerkIds) {
    const { data: existingRows } = await gate.supabase!
      .from('angebot_handwerker')
      .select('id, status')
      .eq('angebot_id', input.angebotId)
      .eq('gewerk_id', gewerkId)
      .eq('handwerker_id', hwId)

    const existing = (existingRows ?? []).find((r) => {
      const st = String(r.status ?? '').toLowerCase()
      return st !== 'ersetzt' && st !== 'abgelehnt'
    })

    if (existing?.id) {
      if (notiz) {
        await gate.supabase!
          .from('angebot_handwerker')
          .update({ aufgabe_notiz: notiz })
          .eq('id', existing.id)
      }
      zuweisungIds.push(String(existing.id))
      continue
    }

    const { data: inserted, error: insErr } = await gate.supabase!
      .from('angebot_handwerker')
      .insert({
        angebot_id: input.angebotId,
        gewerk_id: gewerkId,
        handwerker_id: hwId,
        status: 'ausstehend',
        aufgabe_notiz: notiz,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      return { ok: false, message: insErr?.message ?? 'Handwerker-Zuweisung konnte nicht angelegt werden.' }
    }
    zuweisungIds.push(String(inserted.id))
  }

  revalidatePath(`/angebote/${input.angebotId}`)
  return { ok: true, updated, zuweisungIds }
}

/** Partner-Anfrage für Zuweisungen nach Leistungs-Zuweisen (Angebot). */
export async function sendAngebotLeistungenAnHandwerkerV3(input: {
  angebotId: string
  zuweisungIds: string[]
}): Promise<{ ok: true; gesendet: number } | { ok: false; message: string }> {
  const ids = Array.from(new Set(input.zuweisungIds.map((id) => id.trim()).filter(Boolean)))
  if (!ids.length) return { ok: false, message: 'Keine Zuweisungen zum Senden.' }

  const { loadAngebotDetailAdmin } = await import('@/app/(dashboard)/angebote/actions')
  const { sendHandwerkerAnfrageFuerZuweisung } = await import(
    '@/lib/angebote/send-handwerker-anfrage'
  )

  const detail = await loadAngebotDetailAdmin(input.angebotId)
  if (!detail?.kunden) return { ok: false, message: 'Angebot nicht gefunden.' }

  const byId = new Map((detail.angebot_handwerker ?? []).map((z) => [z.id, z]))
  let gesendet = 0

  for (const id of ids) {
    const row = byId.get(id)
    if (!row) return { ok: false, message: 'Zuweisung nicht gefunden.' }
    const send = await sendHandwerkerAnfrageFuerZuweisung(
      detail,
      row as unknown as Record<string, unknown>,
      true
    )
    if (!send.ok) return { ok: false, message: send.message }
    gesendet++
  }

  revalidatePath(`/angebote/${input.angebotId}`)
  return { ok: true, gesendet }
}

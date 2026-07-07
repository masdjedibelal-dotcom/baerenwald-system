'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  normalizeAngebotPositionen,
  neuePositionsId,
  summenAusPositionen,
} from '@/lib/angebot-positionen'
import { angebotDarfImWizardBearbeitetWerden } from '@/lib/angebote/angebot-wizard-types'
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

function vkLineFromInput(vkNetto: number, menge: number): { lohn_netto: number; material_netto: number; gesamt_min: number; gesamt_max: number } {
  const m = Math.max(menge, 0.0001)
  const line = Math.round(Math.max(vkNetto, 0) * 100) / 100
  const stueck = Math.round((line / m) * 100) / 100
  return {
    lohn_netto: stueck,
    material_netto: 0,
    gesamt_min: line,
    gesamt_max: line,
  }
}

function ekStueckFromInput(ekNetto: number | null | undefined, menge: number): number | undefined {
  if (ekNetto == null || !Number.isFinite(ekNetto) || ekNetto <= 0) return undefined
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
  const vkParts = vkLineFromInput(vkLine, menge)

  const ekInput =
    data.ek_netto !== undefined
      ? data.ek_netto != null && Number.isFinite(data.ek_netto) && data.ek_netto > 0
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

  const menge = data.menge != null && Number.isFinite(data.menge) && data.menge > 0 ? data.menge : 1
  const vkParts = vkLineFromInput(vkNum, menge)
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
  }

  const next = [...gate.positionen]
  const insertAt = insertIndexForBlock(next, blockKey)
  next.splice(insertAt, 0, neu)

  const saved = await persistAngebotPositionen(gate.supabase!, angebotId, next)
  if (!saved.ok) return saved
  return { ok: true, id }
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

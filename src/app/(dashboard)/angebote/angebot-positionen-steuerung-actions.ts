'use server'

import { revalidateAngebotDetail,revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  normalizeAngebotPositionen,summenAusPositionen
} from '@/lib/angebot-positionen'
import { angebotDarfImWizardBearbeitetWerden,angebotWizardBearbeitenSperrgrund } from '@/lib/angebote/angebot-wizard-types'
import {
  resolveGewerkForAngebotPositionen,
} from '@/lib/angebote/resolve-position-gewerk'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { syncAngebotPositionenZuAuftrag } from '@/lib/auftraege/sync-angebot-zu-auftrag'
import { istFreitextPosition,istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
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
  if (error) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebote', error)

  if (error || !data) return { ok: false as const, message: 'Angebot nicht gefunden', supabase: null }
  if (!angebotDarfImWizardBearbeitetWerden(String(data.status))) {
    return {
      ok: false as const,
      message:
        angebotWizardBearbeitenSperrgrund(String(data.status)) ??
        'Dieses Angebot kann nicht mehr bearbeitet werden.',
      supabase: null,
    }
  }

  return {
    ok: true as const,
    supabase,
    positionen: normalizeAngebotPositionen(data.positionen),
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
  if (error) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebote', error)

  if (error) return { ok: false, message: error.message }

  const { data: auftrag, error: error2 } = await supabase
    .from('auftraege')
    .select('id')
    .eq('angebot_id', angebotId)
    .maybeSingle()
  if (error2) logDbError('app/angebote/angebot-positionen-steuerung-actions:auftraege', error2)

  if (auftrag?.id) {
    const { data: angebotHw, error } = await supabaseAdmin
      .from('angebote')
      .select('angebot_handwerker(*)')
      .eq('id', angebotId)
      .maybeSingle()
    if (error) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebote', error)

    const sync = await syncAngebotPositionenZuAuftrag({
      auftragId: String(auftrag.id),
      angebotPositionen: normalized,
      angebotHandwerker: angebotHw?.angebot_handwerker ?? [],
    })
    if (!sync.ok) return sync
    revalidateAuftragDetail(auftrag.id)
  }

  revalidateAngebotDetail(angebotId)
  return { ok: true }
}

/**
 * Partner an Angebots-Positionen zuweisen (Partner-EK + angebot_handwerker),
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
    return { ok: false, message: 'Positionen und Partner erforderlich.' }
  }

  const { data: hw, error: hwErr } = await gate.supabase!
    .from('handwerker')
    .select('id, name, firma')
    .eq('id', hwId)
    .maybeSingle()
  if (hwErr) logDbError('app/angebote/angebot-positionen-steuerung-actions:handwerker', hwErr)
  if (hwErr || !hw) return { ok: false, message: 'Partner nicht gefunden.' }

  const hwName =
    (hw.firma as string | null)?.trim() ||
    (hw.name as string | null)?.trim() ||
    'Partner'

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
    const { data: existingRows, error } = await gate.supabase!
      .from('angebot_handwerker')
      .select('id, status')
      .eq('angebot_id', input.angebotId)
      .eq('gewerk_id', gewerkId)
      .eq('handwerker_id', hwId)
    if (error) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebot_handwerker', error)

    const existing = (existingRows ?? []).find((r) => {
      const st = String(r.status ?? '').toLowerCase()
      return st !== 'ersetzt' && st !== 'abgelehnt'
    })

    if (existing?.id) {
      if (notiz) {
        const { error: __dbErr1 } = await gate.supabase!
          .from('angebot_handwerker')
          .update({ aufgabe_notiz: notiz })
          .eq('id', existing.id)
        if (__dbErr1) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebot_handwerker', __dbErr1)
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
    if (insErr) logDbError('app/angebote/angebot-positionen-steuerung-actions:angebot_handwerker', insErr)

    if (insErr || !inserted?.id) {
      return { ok: false, message: insErr?.message ?? 'Partner-Zuweisung konnte nicht angelegt werden.' }
    }
    zuweisungIds.push(String(inserted.id))
  }

  revalidateAngebotDetail(input.angebotId)
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

  revalidateAngebotDetail(input.angebotId)
  return { ok: true, gesendet }
}

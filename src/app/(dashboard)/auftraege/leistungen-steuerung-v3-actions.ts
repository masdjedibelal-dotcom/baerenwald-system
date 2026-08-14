'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureAngebotHandwerkerGewerkId } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { syncAuftragIstBauprojekt } from '@/lib/auftraege/sync-auftrag-ist-bauprojekt'
import { syncProjektvertragStilleFuerAuftrag } from '@/lib/vertraege/sync-projektvertrag-stille'
import { gewerkIdFuerPosition } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import {
  metaBeimSendenAnHandwerker,
  metaErstzuweisung,
  metaLeistungEntfernt,
  metaPartnerAenderung,
} from '@/lib/auftraege/partner-vorgang-meta'
import { notifyPartnerUnified, partnerVorgangLink } from '@/lib/partner/notify-partner-unified'
import { provisionProjektvertragFireAndForget } from '@/lib/vertraege/provision-projektvertrag'
import { syncProjektvertragStilleFireAndForget } from '@/lib/vertraege/sync-projektvertrag-stille'
import type { AuftragPosition } from '@/lib/types'

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', supabase: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', supabase: null }
  return { ok: true as const, supabase }
}

export async function bulkDeleteAuftragPositionenV3(
  auftragId: string,
  positionIds: string[],
  opts?: { projektName?: string }
): Promise<{ ok: true; deleted: number; markiert: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate
  const ids = Array.from(new Set(positionIds.map((id) => id.trim()).filter(Boolean)))
  if (!ids.length) return { ok: false, message: 'Keine Positionen ausgewählt.' }

  const { data: rows, error: loadErr } = await gate.supabase!
    .from('auftrag_positionen')
    .select('id, leistung_name, handwerker_id, handwerker_status, aenderung_typ, preis_partner')
    .eq('auftrag_id', auftragId)
    .in('id', ids)

  if (loadErr) return { ok: false, message: loadErr.message }

  let deleted = 0
  let markiert = 0
  const projektName = opts?.projektName?.trim() || 'Projekt'

  for (const row of rows ?? []) {
    const id = String(row.id)
    const hwId = row.handwerker_id ? String(row.handwerker_id) : null

    if (hwId) {
      const { error } = await gate.supabase!
        .from('auftrag_positionen')
        .update(metaLeistungEntfernt())
        .eq('id', id)
        .eq('auftrag_id', auftragId)
      if (error) return { ok: false, message: error.message }
      markiert++

      const notify = await notifyPartnerUnified({
        handwerkerId: hwId,
        typ: 'entfernt',
        projektName,
        leistungName: String(row.leistung_name ?? ''),
        link: partnerVorgangLink(auftragId),
        auftragId,
        positionIds: [id],
        aenderungTyp: 'entfernt',
      })
      if (!notify.ok) return { ok: false, message: notify.error }

      syncProjektvertragStilleFireAndForget(auftragId, hwId)
    } else {
      const { error } = await gate.supabase!
        .from('auftrag_positionen')
        .delete()
        .eq('id', id)
        .eq('auftrag_id', auftragId)
      if (error) return { ok: false, message: error.message }
      deleted++
    }
  }

  await syncAuftragIstBauprojekt(auftragId)
  void syncProjektvertragStilleFuerAuftrag(auftragId)

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, deleted, markiert }
}

export async function zuweiseHandwerkerAnPositionenV3(input: {
  auftragId: string
  positionIds: string[]
  handwerkerId: string
  ekNetto?: number | null
}): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const ids = Array.from(new Set(input.positionIds.map((id) => id.trim()).filter(Boolean)))
  const hwId = input.handwerkerId.trim()
  if (!ids.length || !hwId) {
    return { ok: false, message: 'Positionen und Handwerker erforderlich.' }
  }

  const { data: hw } = await gate.supabase!
    .from('handwerker')
    .select('id')
    .eq('id', hwId)
    .maybeSingle()
  if (!hw) return { ok: false, message: 'Handwerker nicht gefunden.' }

  const ek =
    input.ekNetto != null && Number.isFinite(input.ekNetto) && input.ekNetto > 0
      ? Math.round(input.ekNetto * 100) / 100
      : null

  const { data: rows, error: loadErr } = await gate.supabase!
    .from('auftrag_positionen')
    .select('id, gewerk_slug, gewerk_name, handwerker_id, preis_partner, handwerker_status, aenderung_typ')
    .eq('auftrag_id', input.auftragId)
    .in('id', ids)

  if (loadErr) return { ok: false, message: loadErr.message }
  if (!rows?.length) return { ok: false, message: 'Positionen nicht gefunden.' }

  let updated = 0
  for (const row of rows) {
    const current = row as PositionPartnerSnapshotRow
    const partnerPatch =
      metaPartnerAenderung(current, {
        handwerkerId: hwId,
        preisPartner: ek ?? current.preis_partner,
      }) ?? metaErstzuweisung(ek ?? current.preis_partner)

    const patch: Record<string, unknown> = {
      handwerker_id: hwId,
      ...partnerPatch,
    }
    if (ek == null && current.preis_partner != null) {
      // EK unverändert — nicht überschreiben
      delete patch.preis_partner
    }

    const { error } = await gate.supabase!
      .from('auftrag_positionen')
      .update(patch)
      .eq('id', row.id as string)
      .eq('auftrag_id', input.auftragId)
    if (error) return { ok: false, message: error.message }
    updated++

    await ensureAngebotHandwerkerGewerkId(gate.supabase!, {
      auftragId: input.auftragId,
      handwerkerId: hwId,
      gewerkSlug: row.gewerk_slug as string | null,
      gewerkName: String(row.gewerk_name ?? ''),
    })
  }

  provisionProjektvertragFireAndForget(input.auftragId, hwId)

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, updated }
}

type PositionPartnerSnapshotRow = {
  handwerker_id: string | null
  preis_partner: number | null
  handwerker_status?: string | null
  aenderung_typ?: string | null
}

type GewerkOpt = { id: string; name: string; slug: string }

async function findAngebotHandwerkerRow(
  angebotId: string,
  handwerkerId: string,
  pos: Pick<AuftragPosition, 'gewerk_slug' | 'gewerk_name'>,
  gewerke: GewerkOpt[]
) {
  const gewerkId = gewerkIdFuerPosition(pos, gewerke)
  let q = supabaseAdmin
    .from('angebot_handwerker')
    .select('id, status, gesendet_at')
    .eq('angebot_id', angebotId)
    .eq('handwerker_id', handwerkerId)
  if (gewerkId) q = q.eq('gewerk_id', gewerkId)
  const { data } = await q.maybeSingle()
  return data as { id: string; status: string | null; gesendet_at: string | null } | null
}

export async function sendAuftragLeistungenAnHandwerkerV3(input: {
  auftragId: string
  angebotId?: string | null
  projektName: string
  gewerke?: GewerkOpt[]
  /** Nur diese Positionen senden (z. B. nach „Speichern & senden“). */
  positionIds?: string[] | null
}): Promise<
  | { ok: true; gesendet: number; handwerker: number }
  | { ok: false; message: string }
> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const gewerke = input.gewerke ?? []

  const { data: posRows, error: pErr } = await gate.supabase!
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, handwerker_id, handwerker_status, gewerk_slug, gewerk_name, preis_partner, aenderung_typ, preis_alt'
    )
    .eq('auftrag_id', input.auftragId)
    .not('handwerker_id', 'is', null)

  if (pErr) return { ok: false, message: pErr.message }

  const onlyIds = input.positionIds?.length
    ? new Set(input.positionIds.map((id) => id.trim()).filter(Boolean))
    : null

  const zuSenden = (posRows ?? []).filter((p) => {
    if (onlyIds && !onlyIds.has(String(p.id))) return false
    if ((p.aenderung_typ ?? '') === 'entfernt') return false
    const st = (p.handwerker_status ?? '').toLowerCase()
    return st === 'zugewiesen' || st === '' || st === 'ausstehend'
  })

  if (!zuSenden.length) {
    return { ok: false, message: 'Keine zugewiesenen, noch nicht gesendeten Leistungen.' }
  }

  for (const p of zuSenden) {
    if (p.preis_partner == null || Number(p.preis_partner) <= 0) {
      return {
        ok: false,
        message: `„${String(p.leistung_name ?? 'Leistung')}“: preis_partner (Netto-Zeile) fehlt — Handwerker kann nicht annehmen.`,
      }
    }
  }

  const byHw = new Map<string, typeof zuSenden>()
  for (const p of zuSenden) {
    const hwId = String(p.handwerker_id)
    const list = byHw.get(hwId) ?? []
    list.push(p)
    byHw.set(hwId, list)
  }

  const now = new Date().toISOString()
  const angebotId = input.angebotId?.trim() || null
  let gesendet = 0
  const link = partnerVorgangLink(input.auftragId)

  for (const [hwId, positions] of Array.from(byHw.entries())) {
    const posIds = positions.map((p) => String(p.id))

    for (const p of positions) {
      const sendPatch = metaBeimSendenAnHandwerker({
        aenderung_typ: p.aenderung_typ as string | null,
      })
      if (!sendPatch.handwerker_angefragt_at) sendPatch.handwerker_angefragt_at = now

      const { error } = await gate.supabase!
        .from('auftrag_positionen')
        .update(sendPatch)
        .eq('id', p.id)
        .eq('auftrag_id', input.auftragId)
      if (error) return { ok: false, message: error.message }
      gesendet++
    }

    if (angebotId && positions[0]) {
      const ahRow = await findAngebotHandwerkerRow(angebotId, hwId, positions[0] as AuftragPosition, gewerke)
      if (ahRow?.id) {
        const prev = (ahRow.status ?? '').toLowerCase()
        if (!prev || prev === 'zugewiesen' || prev === 'ausstehend') {
          await supabaseAdmin
            .from('angebot_handwerker')
            .update({ status: 'ausstehend', gesendet_at: now })
            .eq('id', ahRow.id)
        }
      }
    }

    const aenderungTyp = positions.some((p) => p.aenderung_typ === 'geaendert')
      ? 'geaendert'
      : positions.some((p) => p.aenderung_typ === 'entfernt')
        ? 'entfernt'
        : 'neu'

    const notify = await notifyPartnerUnified({
      handwerkerId: hwId,
      typ: aenderungTyp === 'geaendert' ? 'geaendert' : 'neu',
      projektName: input.projektName,
      link,
      leistungName:
        positions.length === 1
          ? String(positions[0]!.leistung_name ?? '')
          : `${positions.length} Leistungen`,
      auftragId: input.auftragId,
      positionIds: posIds,
      aenderungTyp,
      preisAlt:
        positions.length === 1 && positions[0]!.preis_alt != null
          ? Number(positions[0]!.preis_alt)
          : null,
    })

    if (!notify.ok) {
      return { ok: false, message: notify.error }
    }

    syncProjektvertragStilleFireAndForget(input.auftragId, hwId)
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, gesendet, handwerker: byHw.size }
}

export async function notifyPartnerPositionGeaendertV3(input: {
  auftragId: string
  angebotId?: string | null
  positionId: string
  projektName: string
  gewerke?: GewerkOpt[]
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: pos } = await gate.supabase!
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, handwerker_id, gewerk_slug, gewerk_name, aenderung_typ, preis_alt, preis_partner, handwerker_status'
    )
    .eq('id', input.positionId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()

  if (!pos?.handwerker_id) return { ok: true, skipped: true }

  const aenderungTyp = (pos.aenderung_typ ?? '') as 'neu' | 'geaendert' | 'entfernt' | ''
  if (!aenderungTyp || aenderungTyp === 'neu') {
    return { ok: true, skipped: true }
  }

  const hwId = String(pos.handwerker_id)

  const notify = await notifyPartnerUnified({
    handwerkerId: hwId,
    typ: aenderungTyp === 'entfernt' ? 'entfernt' : 'geaendert',
    projektName: input.projektName,
    leistungName: String(pos.leistung_name ?? ''),
    link: partnerVorgangLink(input.auftragId),
    auftragId: input.auftragId,
    positionIds: [input.positionId],
    aenderungTyp,
    preisAlt: pos.preis_alt != null ? Number(pos.preis_alt) : null,
  })

  if (!notify.ok) return { ok: false, message: notify.error }

  syncProjektvertragStilleFireAndForget(input.auftragId, hwId)
  return { ok: true }
}

export async function countUnsentZugewieseneLeistungenV3(
  auftragId: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate

  const { data, error } = await gate.supabase!
    .from('auftrag_positionen')
    .select('id, handwerker_id, handwerker_status, aenderung_typ')
    .eq('auftrag_id', auftragId)
    .not('handwerker_id', 'is', null)

  if (error) return { ok: false, message: error.message }

  const count = (data ?? []).filter((p) => {
    if ((p.aenderung_typ ?? '') === 'entfernt') return false
    const st = (p.handwerker_status ?? '').toLowerCase()
    return st === 'zugewiesen' || st === '' || st === 'ausstehend'
  }).length

  return { ok: true, count }
}

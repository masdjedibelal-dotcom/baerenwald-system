'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureAngebotHandwerkerGewerkId } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { syncAuftragIstBauprojekt } from '@/lib/auftraege/sync-auftrag-ist-bauprojekt'
import { syncProjektvertragStilleFuerAuftrag } from '@/lib/vertraege/sync-projektvertrag-stille'
import { gewerkIdFuerPosition } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import { notifyPartnerUnified, partnerOffenLink } from '@/lib/partner/notify-partner-unified'
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
  positionIds: string[]
): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate
  const ids = Array.from(new Set(positionIds.map((id) => id.trim()).filter(Boolean)))
  if (!ids.length) return { ok: false, message: 'Keine Positionen ausgewählt.' }

  let deleted = 0
  for (const id of ids) {
    const { error } = await gate.supabase!
      .from('auftrag_positionen')
      .delete()
      .eq('id', id)
      .eq('auftrag_id', auftragId)
    if (error) return { ok: false, message: error.message }
    deleted++
  }

  await syncAuftragIstBauprojekt(auftragId)
  void syncProjektvertragStilleFuerAuftrag(auftragId)

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, deleted }
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
    .select('id, gewerk_slug, gewerk_name')
    .eq('auftrag_id', input.auftragId)
    .in('id', ids)

  if (loadErr) return { ok: false, message: loadErr.message }
  if (!rows?.length) return { ok: false, message: 'Positionen nicht gefunden.' }

  let updated = 0
  for (const row of rows) {
    const patch: Record<string, unknown> = {
      handwerker_id: hwId,
      handwerker_status: 'zugewiesen',
    }
    if (ek != null) patch.preis_partner = ek

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

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, updated }
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
    .select('id, leistung_name, handwerker_id, handwerker_status, gewerk_slug, gewerk_name')
    .eq('auftrag_id', input.auftragId)
    .not('handwerker_id', 'is', null)

  if (pErr) return { ok: false, message: pErr.message }

  const onlyIds = input.positionIds?.length
    ? new Set(input.positionIds.map((id) => id.trim()).filter(Boolean))
    : null

  const zuSenden = (posRows ?? []).filter((p) => {
    if (onlyIds && !onlyIds.has(String(p.id))) return false
    const st = (p.handwerker_status ?? '').toLowerCase()
    return st === 'zugewiesen' || st === '' || st === 'ausstehend'
  })

  if (!zuSenden.length) {
    return { ok: false, message: 'Keine zugewiesenen, noch nicht gesendeten Leistungen.' }
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

  for (const [hwId, positions] of Array.from(byHw.entries())) {
    const posIds = positions.map((p) => String(p.id))

    for (const id of posIds) {
      const { error } = await gate.supabase!
        .from('auftrag_positionen')
        .update({ handwerker_status: 'angefragt', handwerker_angefragt_at: now })
        .eq('id', id)
        .eq('auftrag_id', input.auftragId)
      if (error) return { ok: false, message: error.message }
      gesendet++
    }

    let anfrageId: string | null = null
    if (angebotId && positions[0]) {
      const ahRow = await findAngebotHandwerkerRow(angebotId, hwId, positions[0] as AuftragPosition, gewerke)
      if (ahRow?.id) {
        anfrageId = ahRow.id
        const prev = (ahRow.status ?? '').toLowerCase()
        if (!prev || prev === 'zugewiesen' || prev === 'ausstehend') {
          await supabaseAdmin
            .from('angebot_handwerker')
            .update({ status: 'ausstehend', gesendet_at: now })
            .eq('id', ahRow.id)
        }
      }
    }

    const link = anfrageId
      ? partnerOffenLink(anfrageId)
      : `/partner?section=anfragen&id=auftrag:${input.auftragId}`

    const notify = await notifyPartnerUnified({
      handwerkerId: hwId,
      typ: 'neu',
      projektName: input.projektName,
      link,
      leistungName:
        positions.length === 1
          ? String(positions[0]!.leistung_name ?? '')
          : `${positions.length} Leistungen`,
      anfrageId,
      auftragId: input.auftragId,
      positionIds: posIds,
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
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: pos } = await gate.supabase!
    .from('auftrag_positionen')
    .select('id, leistung_name, handwerker_id, gewerk_slug, gewerk_name')
    .eq('id', input.positionId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()

  if (!pos?.handwerker_id) return { ok: true }

  const hwId = String(pos.handwerker_id)
  let anfrageId: string | null = null
  const angebotId = input.angebotId?.trim()
  if (angebotId) {
    const row = await findAngebotHandwerkerRow(
      angebotId,
      hwId,
      pos as AuftragPosition,
      input.gewerke ?? []
    )
    anfrageId = row?.id ?? null
  }

  const link = anfrageId
    ? partnerOffenLink(anfrageId)
    : `/partner?section=anfragen&id=auftrag:${input.auftragId}`

  const notify = await notifyPartnerUnified({
    handwerkerId: hwId,
    typ: 'geaendert',
    projektName: input.projektName,
    leistungName: String(pos.leistung_name ?? ''),
    link,
    anfrageId,
    auftragId: input.auftragId,
    positionIds: [input.positionId],
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
    .select('id, handwerker_id, handwerker_status')
    .eq('auftrag_id', auftragId)
    .not('handwerker_id', 'is', null)

  if (error) return { ok: false, message: error.message }

  const count = (data ?? []).filter((p) => {
    const st = (p.handwerker_status ?? '').toLowerCase()
    return st === 'zugewiesen' || st === '' || st === 'ausstehend'
  }).length

  return { ok: true, count }
}

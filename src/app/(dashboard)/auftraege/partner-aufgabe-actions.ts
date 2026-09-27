'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { COPY_ERROR } from '@/lib/copy/errors'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'

function emptyToNull(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim()
  return t ? t : null
}

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: COPY_ERROR.sessionExpired, supabase: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/partner-aufgabe-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: COPY_ERROR.notFound, supabase: null }
  return { ok: true as const, supabase }
}

export type PartnerAufgabeRow = {
  id: string
  auftrag_id: string
  handwerker_id: string
  titel: string | null
  beschreibung: string | null
  sort_order: number | null
  created_at: string
}

/** Titel/Beschreibung einer bestehenden Partner-Aufgabe. */
export async function updateAuftragPartnerAufgabe(input: {
  auftragId: string
  aufgabeId: string
  titel?: string | null
  beschreibung?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const aufgabeId = input.aufgabeId.trim()
  if (!aufgabeId) return { ok: false, message: COPY_ERROR.validation }

  const patch: Record<string, unknown> = {}
  if (input.titel !== undefined) patch.titel = emptyToNull(input.titel)
  if (input.beschreibung !== undefined) patch.beschreibung = emptyToNull(input.beschreibung)
  if (!Object.keys(patch).length) return { ok: true }

  const { error } = await gate.supabase!
    .from('auftrag_partner_aufgaben')
    .update(patch)
    .eq('id', aufgabeId)
    .eq('auftrag_id', input.auftragId.trim())

  if (error) {
    logDbError('app/auftraege/partner-aufgabe-actions:update', error)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true }
}

/**
 * Positionen einer Partner-Aufgabe zuordnen oder herauslösen (`partnerAufgabeId: null`).
 * Schreibt nicht auf leistung_name.
 */
export async function setAuftragPositionenPartnerAufgabe(input: {
  auftragId: string
  positionIds: string[]
  /** null = herauslösen */
  partnerAufgabeId: string | null
}): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const ids = Array.from(new Set(input.positionIds.map((id) => id.trim()).filter(Boolean)))
  if (!ids.length) return { ok: false, message: COPY_ERROR.validation }

  const aufgabeId = input.partnerAufgabeId?.trim() || null
  if (aufgabeId) {
    const { data: aufgabe, error } = await gate.supabase!
      .from('auftrag_partner_aufgaben')
      .select('id')
      .eq('id', aufgabeId)
      .eq('auftrag_id', input.auftragId.trim())
      .maybeSingle()
    if (error) logDbError('app/auftraege/partner-aufgabe-actions:aufgabe', error)
    if (error || !aufgabe) return { ok: false, message: COPY_ERROR.notFound }
  }

  const { error: upErr, count } = await gate.supabase!
    .from('auftrag_positionen')
    .update({ partner_aufgabe_id: aufgabeId }, { count: 'exact' })
    .eq('auftrag_id', input.auftragId.trim())
    .in('id', ids)

  if (upErr) {
    logDbError('app/auftraege/partner-aufgabe-actions:set-positionen', upErr)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true, updated: count ?? ids.length }
}

export async function listAuftragPartnerAufgaben(input: {
  auftragId: string
  handwerkerId?: string | null
}): Promise<{ ok: true; rows: PartnerAufgabeRow[] } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  let q = gate.supabase!
    .from('auftrag_partner_aufgaben')
    .select('id, auftrag_id, handwerker_id, titel, beschreibung, sort_order, created_at')
    .eq('auftrag_id', input.auftragId.trim())
    .order('created_at', { ascending: true })

  const hw = input.handwerkerId?.trim()
  if (hw) q = q.eq('handwerker_id', hw)

  const { data, error } = await q
  if (error) {
    logDbError('app/auftraege/partner-aufgabe-actions:list', error)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  return { ok: true, rows: (data ?? []) as PartnerAufgabeRow[] }
}

export async function getAuftragPartnerAufgabe(input: {
  auftragId: string
  aufgabeId: string
}): Promise<{ ok: true; row: PartnerAufgabeRow } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data, error } = await gate.supabase!
    .from('auftrag_partner_aufgaben')
    .select('id, auftrag_id, handwerker_id, titel, beschreibung, sort_order, created_at')
    .eq('id', input.aufgabeId.trim())
    .eq('auftrag_id', input.auftragId.trim())
    .maybeSingle()

  if (error) {
    logDbError('app/auftraege/partner-aufgabe-actions:get', error)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }
  if (!data) return { ok: false, message: COPY_ERROR.notFound }
  return { ok: true, row: data as PartnerAufgabeRow }
}

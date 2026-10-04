'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type MailAnrede } from '@/lib/mail/anrede'
import { gewichteterFortschrittProzent } from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  metaHandwerkerEntfernt,metaPartnerAenderung
} from '@/lib/auftraege/partner-vorgang-meta'
import type { AuftragLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import type { AuftragPosition } from '@/lib/types'
import {
  positionPatchBenoetigtVertragSync,
  syncProjektvertragStilleFireAndForget,
} from '@/lib/vertraege/sync-projektvertrag-stille'

/** Fortschritt auf Auftragsebene aus Leistungsstatus + Verkaufspreisen berechnen. */
export async function syncAuftragFortschrittFromPositionen(
  auftragId: string
): Promise<{ ok: true; fortschritt: number } | { ok: false; message: string }> {
const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_positionen')
    .select('preis_fix, leistung_status')
    .eq('auftrag_id', auftragId)
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', error)

  if (error) {
    if (error.code === '42703' || error.message.includes('leistung_status')) {
      const { data: fallback, error: err2 } = await supabase
        .from('auftrag_positionen')
        .select('preis_fix')
        .eq('auftrag_id', auftragId)
      if (err2) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', err2)
      if (err2) return { ok: false, message: err2.message }
      const pct = gewichteterFortschrittProzent(
        (fallback ?? []).map((r) => ({ preis_fix: r.preis_fix, leistung_status: 'offen' } as AuftragPosition))
      )
      const { error: upErr } = await supabase
        .from('auftraege')
        .update({ fortschritt: pct, updated_at: new Date().toISOString() })
        .eq('id', auftragId)
      if (upErr) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', upErr)
      if (upErr) return { ok: false, message: upErr.message }
      revalidateAuftragDetail(auftragId)
      return { ok: true, fortschritt: pct }
    }
    return { ok: false, message: error.message }
  }

  const pct = gewichteterFortschrittProzent((data ?? []) as AuftragPosition[])
  const { error: upErr } = await supabase
    .from('auftraege')
    .update({ fortschritt: pct, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (upErr) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', upErr)
  if (upErr) return { ok: false, message: upErr.message }
  revalidateAuftragDetail(auftragId)
  return { ok: true, fortschritt: pct }
}

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', userId: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', userId: null }
  return { ok: true as const, userId: user.id }
}

export async function updateAuftragPositionSteuerung(
  posId: string,
  auftragId: string,
  data: Partial<
    Pick<
      AuftragPosition,
      | 'gewerk_slug'
      | 'gewerk_name'
      | 'gewerk_block_key'
      | 'projekt_phase'
      | 'oberkategorie'
      | 'unterkategorie'
      | 'leistung_name'
      | 'beschreibung'
      | 'einheit'
      | 'menge'
      | 'preis_fix'
      | 'preis_partner'
      | 'lohn_fix'
      | 'material_fix'
      | 'start_datum'
      | 'end_datum'
      | 'handwerker_id'
      | 'leistung_status'
    >
  >
): Promise<{ ok: true; partnerAenderung?: boolean } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v
  }
  if (!Object.keys(patch).length) return { ok: true }

  const { data: currentRow, error } = await supabase
    .from('auftrag_positionen')
    .select('handwerker_id, preis_partner, handwerker_status, aenderung_typ, leistung_name, beschreibung')
    .eq('id', posId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', error)

  const current = currentRow as {
    handwerker_id: string | null
    preis_partner: number | null
    handwerker_status?: string | null
    aenderung_typ?: string | null
    leistung_name?: string | null
    beschreibung?: string | null
  } | null

  if (patch.handwerker_id === null) {
    Object.assign(patch, metaHandwerkerEntfernt())
  } else if (current) {
    const inhaltGeaendert =
      ('leistung_name' in patch &&
        String(patch.leistung_name ?? '') !== String(current.leistung_name ?? '')) ||
      ('beschreibung' in patch &&
        String(patch.beschreibung ?? '') !== String(current.beschreibung ?? ''))

    const partnerMeta = metaPartnerAenderung(current, {
      handwerkerId: 'handwerker_id' in patch ? (patch.handwerker_id as string | null) : undefined,
      preisPartner: 'preis_partner' in patch ? (patch.preis_partner as number | null) : undefined,
      inhaltGeaendert,
    })
    if (partnerMeta) Object.assign(patch, partnerMeta)
  }

  if (patch.preis_partner != null && !('handwerker_id' in patch) && !current?.handwerker_id) {
    patch.preis_partner = null
  }

  let vorherHandwerkerId: string | null = null
  if (positionPatchBenoetigtVertragSync(patch)) {
    vorherHandwerkerId = current?.handwerker_id ? String(current.handwerker_id) : null
  }

  const { error: error2 } = await supabase.from('auftrag_positionen').update(patch).eq('id', posId)
  if (error2) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', error2)
  if (error2) return { ok: false, message: error2.message }

  if (positionPatchBenoetigtVertragSync(patch)) {
    const nachherHandwerkerId =
      patch.handwerker_id !== undefined
        ? patch.handwerker_id
          ? String(patch.handwerker_id)
          : null
        : vorherHandwerkerId
    if (vorherHandwerkerId && vorherHandwerkerId !== nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, vorherHandwerkerId)
    }
    if (nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, nachherHandwerkerId)
    }
  }
  if ('leistung_status' in patch || 'preis_fix' in patch) {
    await syncAuftragFortschrittFromPositionen(auftragId)
  } else {
    revalidateAuftragDetail(auftragId)
  }
  const partnerAenderung = Boolean(
    current?.handwerker_id &&
      patch.aenderung_typ &&
      patch.aenderung_typ !== 'neu'
  )
  return { ok: true, partnerAenderung }
}

export async function updateAuftragPositionLeistungStatus(input: {
  auftragId: string
  positionId: string
  status: AuftragLeistungStatus
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return updateAuftragPositionSteuerung(input.positionId, input.auftragId, {
    leistung_status: input.status,
  })
}

export async function getKundeInformierenMailDefaults(
  auftragId: string
): Promise<{ ok: true; defaultAnrede: MailAnrede } | { ok: false; message: string }> {
  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunden(typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', error)
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  return { ok: true, defaultAnrede: 'sie' }
}

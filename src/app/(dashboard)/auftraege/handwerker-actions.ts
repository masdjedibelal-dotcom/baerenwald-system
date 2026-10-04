'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { createClient } from '@/lib/supabase-server'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { ensureAngebotHandwerkerGewerkId } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { filterHandwerkerFuerGewerkSlug } from '@/lib/handwerker/gewerk-match'
import type { AuftragHandwerkerZuweisungStatus } from '@/lib/auftraege/auftrag-handwerker-status'
import { notifyPartnerUnified,partnerVorgangLink } from '@/lib/partner/notify-partner-unified'
import { assertPartnerVersandOrgFreigabe } from '@/lib/org/assert-partner-versand-org-freigabe'
import {
listHandwerkerFuerGewerk,type HandwerkerGewerkListeEintrag
} from '@/app/(dashboard)/angebote/actions'
import {
planAuftragHandwerkerStatusWrite
} from '@/lib/status/write-auftrag-handwerker-status'
import { createPartnerAufgabeAndLinkPositions } from '@/lib/auftraege/partner-aufgabe-write'
import { COPY_ERROR } from '@/lib/copy/errors'
export { listHandwerkerFuerGewerk }

type HandwerkerRow = {
  id: string
  name: string
  firma: string | null
  telefon: string | null
  email: string | null
  gewerke: string[] | null
  bewertung_gesamt?: number | null
}

function mapHandwerkerMitEinsatz(
  rows: HandwerkerRow[],
  lastByHw: Map<string, string>,
  busyIds: Set<string>
): HandwerkerGewerkListeEintrag[] {
  return rows.map((h) => ({
    id: h.id,
    name: h.name,
    firma: h.firma,
    telefon: h.telefon,
    letzter_einsatz: lastByHw.get(h.id) ?? null,
    verfuegbar: !busyIds.has(h.id),
    gewerke: h.gewerke ?? null,
    bewertung:
      h.bewertung_gesamt != null && Number.isFinite(h.bewertung_gesamt)
        ? Number(h.bewertung_gesamt)
        : null,
  }))
}

async function loadEinsatzMeta(
  supabase: SupabaseClient,
  ids: string[]
): Promise<{ lastByHw: Map<string, string>; busyIds: Set<string> }> {
  const lastByHw = new Map<string, string>()
  const busyIds = new Set<string>()
  if (!ids.length) return { lastByHw, busyIds }

  const { data: ah, error } = await supabase
    .from('auftrag_handwerker')
    .select('handwerker_id, auftraege(created_at, status)')
    .in('handwerker_id', ids)
  if (error) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', error)

  for (const row of ah ?? []) {
    const hid = row.handwerker_id as string
    const auf = row.auftraege as
      | { created_at?: string; status?: string }
      | { created_at?: string; status?: string }[]
      | null
    const a = Array.isArray(auf) ? auf[0] : auf
    if (a?.created_at) {
      const cur = lastByHw.get(hid)
      if (!cur || a.created_at > cur) lastByHw.set(hid, a.created_at)
    }
    if (a?.status === 'offen' || a?.status === 'in_arbeit') busyIds.add(hid)
  }
  return { lastByHw, busyIds }
}

/** Empfohlene (Gewerk-Slug) + alle aktiven Handwerker für Auswahl-Modal */
export async function listHandwerkerAuswahlFuerGewerk(input: {
  gewerkId?: string | null
  gewerkSlug?: string | null
}): Promise<
  | { ok: true; empfohlen: HandwerkerGewerkListeEintrag[]; alle: HandwerkerGewerkListeEintrag[]; gewerkSlug: string | null }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  let slug = input.gewerkSlug?.trim() || null

  if (!slug && input.gewerkId) {
    const { data: gw, error } = await supabase.from('gewerke').select('slug').eq('id', input.gewerkId).maybeSingle()
    if (error) logDbError('app/auftraege/handwerker-actions:gewerke', error)
    slug = (gw?.slug as string | null) ?? null
  }

  const { data: allHw, error: hErr } = await supabase
    .from('handwerker')
    .select('id, name, firma, telefon, email, gewerke, aktiv, bewertung_gesamt')
    .eq('aktiv', true)
    .order('name')
  if (hErr) logDbError('app/auftraege/handwerker-actions:handwerker', hErr)

  if (hErr) {
    // Fallback ohne Bewertungs-Spalte (ältere DBs)
    if (hErr.message.includes('bewertung')) {
      const retry = await supabase
        .from('handwerker')
        .select('id, name, firma, telefon, email, gewerke, aktiv')
        .eq('aktiv', true)
        .order('name')
      if (retry.error) return { ok: false, message: retry.error.message }
      const rows = (retry.data ?? []) as HandwerkerRow[]
      const ids = rows.map((h) => h.id)
      const { lastByHw, busyIds } = await loadEinsatzMeta(supabase, ids)
      const empfohlenRaw = slug ? filterHandwerkerFuerGewerkSlug(rows, slug) : []
      const empfohlenIds = new Set(empfohlenRaw.map((h) => h.id))
      const alleRaw = rows.filter((h) => !empfohlenIds.has(h.id))
      return {
        ok: true,
        gewerkSlug: slug,
        empfohlen: mapHandwerkerMitEinsatz(empfohlenRaw, lastByHw, busyIds),
        alle: mapHandwerkerMitEinsatz(alleRaw, lastByHw, busyIds),
      }
    }
    return { ok: false, message: hErr.message }
  }

  const rows = (allHw ?? []) as HandwerkerRow[]
  const ids = rows.map((h) => h.id)
  const { lastByHw, busyIds } = await loadEinsatzMeta(supabase, ids)

  const empfohlenRaw = slug ? filterHandwerkerFuerGewerkSlug(rows, slug) : []
  const empfohlenIds = new Set(empfohlenRaw.map((h) => h.id))
  const alleRaw = rows.filter((h) => !empfohlenIds.has(h.id))

  return {
    ok: true,
    gewerkSlug: slug,
    empfohlen: mapHandwerkerMitEinsatz(empfohlenRaw, lastByHw, busyIds),
    alle: mapHandwerkerMitEinsatz(alleRaw, lastByHw, busyIds),
  }
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function logHwTimeline(
  auftragId: string,
  titel: string,
  beschreibung: string,
  handwerkerId?: string | null
) {
  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'handwerker_zuweisung',
    titel,
    beschreibung,
    handwerker_id: handwerkerId ?? null,
    erstellt_von: uid,
  })
}

/** Handwerker einem Gewerk (alle oder ausgewählte Positionen) zuweisen */
export async function assignAuftragHandwerkerGewerk(input: {
  auftragId: string
  gewerkId: string
  handwerkerId: string
  positionIds?: string[]
  status?: AuftragHandwerkerZuweisungStatus
  hwRechnungReverseCharge13b?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate

  const freigabeGate = await assertPartnerVersandOrgFreigabe({ auftragId: input.auftragId })
  if (!freigabeGate.ok) return freigabeGate

  const supabase = gate.db
  const status = input.status ?? 'angefragt'
  const now = new Date().toISOString()

  const { data: hw, error } = await supabase
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/handwerker-actions:handwerker', error)
  if (!hw) return { ok: false, message: 'Partner nicht gefunden' }

  const { data: gw, error: error2 } = await supabase.from('gewerke').select('id, name, slug').eq('id', input.gewerkId).maybeSingle()
  if (error2) logDbError('app/auftraege/handwerker-actions:gewerke', error2)
  if (!gw) return { ok: false, message: 'Gewerk nicht gefunden' }

  const { data: existing, error: error3 } = await supabase
    .from('auftrag_handwerker')
    .select('id')
    .eq('auftrag_id', input.auftragId)
    .eq('gewerk_id', input.gewerkId)
    .maybeSingle()
  if (error3) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', error3)

  if (existing?.id) {
    const { error } = await supabase
      .from('auftrag_handwerker')
      .update(planAuftragHandwerkerStatusWrite(status, { handwerker_id: input.handwerkerId }))
      .eq('id', existing.id)
    if (error) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', error)
    if (error) return { ok: false, message: error.message }
  } else {
    const { error } = await supabase.from('auftrag_handwerker').insert({
      auftrag_id: input.auftragId,
      gewerk_id: input.gewerkId,
      handwerker_id: input.handwerkerId,
      status,
    })
    if (error) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', error)
    if (error) return { ok: false, message: error.message }
  }

  let posQuery = supabase
    .from('auftrag_positionen')
    .select('id, preis_partner, lohn_fix, material_fix, leistung_name')
    .eq('auftrag_id', input.auftragId)

  if (input.positionIds?.length) {
    posQuery = posQuery.in('id', input.positionIds)
  } else if (gw.slug) {
    posQuery = posQuery.eq('gewerk_slug', gw.slug as string)
  } else {
    posQuery = posQuery.eq('gewerk_name', gw.name as string)
  }

  const { data: posRows } = await posQuery
  const linkedPosIds: string[] = []
  if (posRows?.length) {
    for (const p of posRows) {
      const patch: Record<string, unknown> = {
        handwerker_id: input.handwerkerId,
        handwerker_status: status,
        handwerker_angefragt_at: status === 'angefragt' ? now : null,
      }
      // preis_partner nur aus EK/Kondition — nie lohn_fix+material_fix (Kunden-VK)
      const { error: posErr } = await supabase.from('auftrag_positionen').update(patch).eq('id', p.id as string)
      if (posErr) logDbError('app/auftraege/handwerker-actions:auftrag_positionen', posErr)
      if (posErr) return { ok: false, message: COPY_ERROR.saveFailed }
      linkedPosIds.push(String(p.id))
    }
  }

  if (linkedPosIds.length) {
    const aufgabe = await createPartnerAufgabeAndLinkPositions(supabase, {
      auftragId: input.auftragId,
      handwerkerId: input.handwerkerId,
      positionIds: linkedPosIds,
    })
    if (!aufgabe.ok) return aufgabe
  }

  await logHwTimeline(
    input.auftragId,
    `Partner zugewiesen: ${hw.name}`,
    `${gw.name} → ${hw.name} (${status})`,
    input.handwerkerId
  )

  await ensureAngebotHandwerkerGewerkId(supabase, {
    auftragId: input.auftragId,
    handwerkerId: input.handwerkerId,
    gewerkSlug: gw.slug as string | null,
    gewerkName: gw.name as string,
  })

  const { data: auftragMeta, error: error4 } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (error4) logDbError('app/auftraege/handwerker-actions:auftraege', error4)
  const angebotId = String(auftragMeta?.angebot_id ?? '').trim()
  if (angebotId) {
    const rc13b = input.hwRechnungReverseCharge13b === true
    await supabase
      .from('angebot_handwerker')
      .update({ hw_rechnung_reverse_charge_13b: rc13b })
      .eq('angebot_id', angebotId)
      .eq('handwerker_id', input.handwerkerId)
      .eq('gewerk_id', input.gewerkId)
  }

  {
    const { data: auf, error } = await supabase
      .from('auftraege')
      .select('titel')
      .eq('id', input.auftragId)
      .maybeSingle()
    if (error) logDbError('app/auftraege/handwerker-actions:auftraege', error)
    const projektName =
      String(auf?.titel ?? '').trim() || `Auftrag ${input.auftragId.slice(0, 8)}`
    const posIds = (posRows ?? []).map((p) => String(p.id))
    const notify = await notifyPartnerUnified({
      handwerkerId: input.handwerkerId,
      typ: 'neu',
      projektName,
      link: partnerVorgangLink(input.auftragId),
      leistungName:
        posRows?.length === 1
          ? String((posRows[0] as { leistung_name?: string | null }).leistung_name ?? gw.name)
          : posRows?.length
            ? `${posRows.length} Leistungen`
            : String(gw.name ?? 'Leistung'),
      auftragId: input.auftragId,
      positionIds: posIds.length ? posIds : undefined,
      aenderungTyp: 'neu',
    })
    if (!notify.ok) {
      console.warn('[assignAuftragHandwerkerGewerk] Partner-Notify:', notify.error)
    }
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true }
}

/** Partner einer einzelnen Leistungsposition zuweisen */
export async function assignAuftragHandwerkerPosition(input: {
  auftragId: string
  positionId: string
  handwerkerId: string
  status?: AuftragHandwerkerZuweisungStatus
  hwRechnungReverseCharge13b?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate

  const freigabeGate = await assertPartnerVersandOrgFreigabe({ auftragId: input.auftragId })
  if (!freigabeGate.ok) return freigabeGate

  const supabase = gate.db
  const status = input.status ?? 'angefragt'
  const now = new Date().toISOString()

  const { data: pos, error: posErr } = await supabase
    .from('auftrag_positionen')
    .select('id, auftrag_id, gewerk_slug, gewerk_name, leistung_name, preis_partner, lohn_fix, material_fix')
    .eq('id', input.positionId)
    .maybeSingle()
  if (posErr) logDbError('app/auftraege/handwerker-actions:auftrag_positionen', posErr)
  if (posErr) return { ok: false, message: posErr.message }
  if (!pos) return { ok: false, message: 'Position nicht gefunden' }
  if (pos.auftrag_id !== input.auftragId) {
    return { ok: false, message: 'Position gehört nicht zu diesem Auftrag' }
  }

  const { data: hw, error: error2 } = await supabase
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (error2) logDbError('app/auftraege/handwerker-actions:handwerker', error2)
  if (!hw) return { ok: false, message: 'Partner nicht gefunden' }

  const posPatch: Record<string, unknown> = {
    handwerker_id: input.handwerkerId,
    handwerker_status: status,
    handwerker_angefragt_at: status === 'angefragt' ? now : null,
  }

  const { error: error3 } = await supabase
    .from('auftrag_positionen')
    .update(posPatch)
    .eq('id', input.positionId)
  if (error3) logDbError('app/auftraege/handwerker-actions:auftrag_positionen', error3)
  if (error3) return { ok: false, message: COPY_ERROR.saveFailed }

  const aufgabe = await createPartnerAufgabeAndLinkPositions(supabase, {
    auftragId: input.auftragId,
    handwerkerId: input.handwerkerId,
    positionIds: [input.positionId],
  })
  if (!aufgabe.ok) return aufgabe

  if (pos.gewerk_slug) {
    const { data: gw, error } = await supabase
      .from('gewerke')
      .select('id')
      .eq('slug', pos.gewerk_slug as string)
      .maybeSingle()
    if (error) logDbError('app/auftraege/handwerker-actions:gewerke', error)
    if (gw?.id) {
      const { data: existing, error } = await supabase
        .from('auftrag_handwerker')
        .select('id')
        .eq('auftrag_id', input.auftragId)
        .eq('gewerk_id', gw.id)
        .maybeSingle()
      if (error) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', error)
      if (existing?.id) {
        const { error: __dbErr1 } = await supabase
          .from('auftrag_handwerker')
          .update(planAuftragHandwerkerStatusWrite(status, { handwerker_id: input.handwerkerId }))
          .eq('id', existing.id)
        if (__dbErr1) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', __dbErr1)
      } else {
        const { error: __dbErr2 } = await supabase.from('auftrag_handwerker').insert({
          auftrag_id: input.auftragId,
          gewerk_id: gw.id,
          handwerker_id: input.handwerkerId,
          status,
        })
        if (__dbErr2) logDbError('app/auftraege/handwerker-actions:auftrag_handwerker', __dbErr2)
      }
    }
  }

  await logHwTimeline(
    input.auftragId,
    `Partner für Leistung: ${hw.name}`,
    `${pos.leistung_name} (${pos.gewerk_name}) → ${hw.name} (${status})`,
    input.handwerkerId
  )

  await ensureAngebotHandwerkerGewerkId(supabase, {
    auftragId: input.auftragId,
    handwerkerId: input.handwerkerId,
    gewerkSlug: pos.gewerk_slug as string | null,
    gewerkName: String(pos.gewerk_name ?? ''),
  })

  const { data: auftragMeta, error: error4 } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (error4) logDbError('app/auftraege/handwerker-actions:auftraege', error4)
  const angebotId = String(auftragMeta?.angebot_id ?? '').trim()
  if (angebotId && pos.gewerk_slug) {
    const { data: gwForPos, error } = await supabase
      .from('gewerke')
      .select('id')
      .eq('slug', pos.gewerk_slug as string)
      .maybeSingle()
    if (error) logDbError('app/auftraege/handwerker-actions:gewerke', error)
    const gewerkIdForPos = String(gwForPos?.id ?? '').trim()
    if (gewerkIdForPos) {
      const rc13b = input.hwRechnungReverseCharge13b === true
      await supabase
        .from('angebot_handwerker')
        .update({ hw_rechnung_reverse_charge_13b: rc13b })
        .eq('angebot_id', angebotId)
        .eq('handwerker_id', input.handwerkerId)
        .eq('gewerk_id', gewerkIdForPos)
    }
  }

  {
    const { data: auf, error } = await supabase
      .from('auftraege')
      .select('titel')
      .eq('id', input.auftragId)
      .maybeSingle()
    if (error) logDbError('app/auftraege/handwerker-actions:auftraege', error)
    const projektName =
      String(auf?.titel ?? '').trim() || `Auftrag ${input.auftragId.slice(0, 8)}`
    const notify = await notifyPartnerUnified({
      handwerkerId: input.handwerkerId,
      typ: 'neu',
      projektName,
      link: partnerVorgangLink(input.auftragId),
      leistungName: String(pos.leistung_name ?? pos.gewerk_name ?? 'Leistung'),
      auftragId: input.auftragId,
      positionIds: [input.positionId],
      aenderungTyp: 'neu',
    })
    if (!notify.ok) {
      console.warn('[assignAuftragHandwerkerPosition] Partner-Notify:', notify.error)
    }
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true }
}

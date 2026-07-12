'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { ensureAngebotHandwerkerGewerkId } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { filterHandwerkerFuerGewerkSlug, handwerkerHatGewerkSlug } from '@/lib/handwerker/gewerk-match'
import type { AuftragHandwerkerZuweisungStatus } from '@/lib/auftraege/auftrag-handwerker-status'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { metaBeimSendenAnHandwerker } from '@/lib/auftraege/partner-vorgang-meta'
import { notifyPartnerUnified, partnerVorgangLink } from '@/lib/partner/notify-partner-unified'
import {
  listHandwerkerFuerGewerk,
  replaceAngebotHandwerkerUndSenden,
  type HandwerkerGewerkListeEintrag,
} from '@/app/(dashboard)/angebote/actions'
export { listHandwerkerFuerGewerk }

type HandwerkerRow = {
  id: string
  name: string
  firma: string | null
  telefon: string | null
  email: string | null
  gewerke: string[] | null
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
  }))
}

async function requireCrmSession(): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }
  return { ok: true }
}

/** CRM-Schreibzugriff: Detail lädt per Service Role, RLS blockiert sonst oft Positionen-Updates. */
function crmDb(): SupabaseClient {
  return supabaseAdmin
}

async function loadEinsatzMeta(
  supabase: SupabaseClient,
  ids: string[]
): Promise<{ lastByHw: Map<string, string>; busyIds: Set<string> }> {
  const lastByHw = new Map<string, string>()
  const busyIds = new Set<string>()
  if (!ids.length) return { lastByHw, busyIds }

  const { data: ah } = await supabase
    .from('auftrag_handwerker')
    .select('handwerker_id, auftraege(created_at, status)')
    .in('handwerker_id', ids)

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
    const { data: gw } = await supabase.from('gewerke').select('slug').eq('id', input.gewerkId).maybeSingle()
    slug = (gw?.slug as string | null) ?? null
  }

  const { data: allHw, error: hErr } = await supabase
    .from('handwerker')
    .select('id, name, firma, telefon, email, gewerke, aktiv')
    .eq('aktiv', true)
    .order('name')

  if (hErr) return { ok: false, message: hErr.message }

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
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const status = input.status ?? 'angefragt'
  const now = new Date().toISOString()

  const { data: hw } = await supabase
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (!hw) return { ok: false, message: 'Handwerker nicht gefunden' }

  const { data: gw } = await supabase.from('gewerke').select('id, name, slug').eq('id', input.gewerkId).maybeSingle()
  if (!gw) return { ok: false, message: 'Gewerk nicht gefunden' }

  const { data: existing } = await supabase
    .from('auftrag_handwerker')
    .select('id')
    .eq('auftrag_id', input.auftragId)
    .eq('gewerk_id', input.gewerkId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('auftrag_handwerker')
      .update({ handwerker_id: input.handwerkerId, status })
      .eq('id', existing.id)
    if (error) return { ok: false, message: error.message }
  } else {
    const { error } = await supabase.from('auftrag_handwerker').insert({
      auftrag_id: input.auftragId,
      gewerk_id: input.gewerkId,
      handwerker_id: input.handwerkerId,
      status,
    })
    if (error) return { ok: false, message: error.message }
  }

  let posQuery = supabase
    .from('auftrag_positionen')
    .select('id, preis_partner, lohn_fix, material_fix')
    .eq('auftrag_id', input.auftragId)

  if (input.positionIds?.length) {
    posQuery = posQuery.in('id', input.positionIds)
  } else if (gw.slug) {
    posQuery = posQuery.eq('gewerk_slug', gw.slug as string)
  } else {
    posQuery = posQuery.eq('gewerk_name', gw.name as string)
  }

  const { data: posRows } = await posQuery
  if (posRows?.length) {
    for (const p of posRows) {
      const ekFallback = (Number(p.lohn_fix) || 0) + (Number(p.material_fix) || 0)
      const patch: Record<string, unknown> = {
        handwerker_id: input.handwerkerId,
        handwerker_status: status,
        handwerker_angefragt_at: status === 'angefragt' ? now : null,
      }
      if ((p.preis_partner == null || Number(p.preis_partner) <= 0) && ekFallback > 0) {
        patch.preis_partner = ekFallback
      }
      const { error: posErr } = await supabase.from('auftrag_positionen').update(patch).eq('id', p.id as string)
      if (posErr) return { ok: false, message: posErr.message }
    }
  }

  await logHwTimeline(
    input.auftragId,
    `Handwerker zugewiesen: ${hw.name}`,
    `${gw.name} → ${hw.name} (${status})`,
    input.handwerkerId
  )

  await ensureAngebotHandwerkerGewerkId(supabase, {
    auftragId: input.auftragId,
    handwerkerId: input.handwerkerId,
    gewerkSlug: gw.slug as string | null,
    gewerkName: gw.name as string,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

/** Handwerker einer einzelnen Leistungsposition zuweisen */
export async function assignAuftragHandwerkerPosition(input: {
  auftragId: string
  positionId: string
  handwerkerId: string
  status?: AuftragHandwerkerZuweisungStatus
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const status = input.status ?? 'angefragt'
  const now = new Date().toISOString()

  const { data: pos, error: posErr } = await supabase
    .from('auftrag_positionen')
    .select('id, auftrag_id, gewerk_slug, gewerk_name, leistung_name, preis_partner, lohn_fix, material_fix')
    .eq('id', input.positionId)
    .maybeSingle()
  if (posErr) return { ok: false, message: posErr.message }
  if (!pos) return { ok: false, message: 'Position nicht gefunden' }
  if (pos.auftrag_id !== input.auftragId) {
    return { ok: false, message: 'Position gehört nicht zu diesem Auftrag' }
  }

  const { data: hw } = await supabase
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (!hw) return { ok: false, message: 'Handwerker nicht gefunden' }

  const posPatch: Record<string, unknown> = {
    handwerker_id: input.handwerkerId,
    handwerker_status: status,
    handwerker_angefragt_at: status === 'angefragt' ? now : null,
  }
  const ekFallback = (Number(pos.lohn_fix) || 0) + (Number(pos.material_fix) || 0)
  if ((pos.preis_partner == null || Number(pos.preis_partner) <= 0) && ekFallback > 0) {
    posPatch.preis_partner = ekFallback
  }

  const { error } = await supabase
    .from('auftrag_positionen')
    .update(posPatch)
    .eq('id', input.positionId)
  if (error) return { ok: false, message: error.message }

  if (pos.gewerk_slug) {
    const { data: gw } = await supabase
      .from('gewerke')
      .select('id')
      .eq('slug', pos.gewerk_slug as string)
      .maybeSingle()
    if (gw?.id) {
      const { data: existing } = await supabase
        .from('auftrag_handwerker')
        .select('id')
        .eq('auftrag_id', input.auftragId)
        .eq('gewerk_id', gw.id)
        .maybeSingle()
      if (existing?.id) {
        await supabase
          .from('auftrag_handwerker')
          .update({ handwerker_id: input.handwerkerId, status })
          .eq('id', existing.id)
      } else {
        await supabase.from('auftrag_handwerker').insert({
          auftrag_id: input.auftragId,
          gewerk_id: gw.id,
          handwerker_id: input.handwerkerId,
          status,
        })
      }
    }
  }

  await logHwTimeline(
    input.auftragId,
    `Handwerker für Leistung: ${hw.name}`,
    `${pos.leistung_name} (${pos.gewerk_name}) → ${hw.name} (${status})`,
    input.handwerkerId
  )

  await ensureAngebotHandwerkerGewerkId(supabase, {
    auftragId: input.auftragId,
    handwerkerId: input.handwerkerId,
    gewerkSlug: pos.gewerk_slug as string | null,
    gewerkName: String(pos.gewerk_name ?? ''),
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

/** TC-11d: Partner hat abgelehnt → anderen Partner zuweisen und erneut anfragen. */
export async function replaceAuftragHandwerkerUndSenden(input: {
  auftragId: string
  alteZuweisungId: string
  neuerHandwerkerId: string
  projektName?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const auftragId = input.auftragId.trim()
  const alteZuweisungId = input.alteZuweisungId.trim()
  const neuerHandwerkerId = input.neuerHandwerkerId.trim()
  if (!auftragId || !alteZuweisungId || !neuerHandwerkerId) {
    return { ok: false, message: 'Auftrag, Zuweisung oder Partner fehlt.' }
  }

  const { data: zuAlt, error: zErr } = await supabase
    .from('auftrag_handwerker')
    .select(
      'id, auftrag_id, handwerker_id, gewerk_id, status, gewerke(id, name, slug), handwerker(id, name)'
    )
    .eq('id', alteZuweisungId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (zErr || !zuAlt) return { ok: false, message: 'Zuweisung nicht gefunden.' }

  const altStatus = String(zuAlt.status ?? '').toLowerCase()
  if (altStatus !== 'abgelehnt') {
    return { ok: false, message: 'Nur abgelehnte Zuweisungen können neu disponiert werden.' }
  }

  const alterHandwerkerId = String(zuAlt.handwerker_id)
  if (alterHandwerkerId === neuerHandwerkerId) {
    return { ok: false, message: 'Bitte einen anderen Partner auswählen.' }
  }

  const gwRaw = zuAlt.gewerke as unknown
  const gw = (Array.isArray(gwRaw) ? gwRaw[0] : gwRaw) as
    | { id?: string; name?: string; slug?: string }
    | null
  const gewerkId = zuAlt.gewerk_id ? String(zuAlt.gewerk_id) : gw?.id ? String(gw.id) : null
  const gewerkSlug = gw?.slug?.trim() || null
  const gewerkName = gw?.name?.trim() || 'Gewerk'

  const { data: hwNeu, error: hwErr } = await supabase
    .from('handwerker')
    .select('id, name, gewerke, aktiv')
    .eq('id', neuerHandwerkerId)
    .maybeSingle()
  if (hwErr || !hwNeu?.aktiv) return { ok: false, message: 'Partner nicht gefunden oder inaktiv.' }
  if (gewerkSlug && !handwerkerHatGewerkSlug(hwNeu.gewerke as string[] | null, gewerkSlug)) {
    return { ok: false, message: 'Partner deckt dieses Gewerk nicht ab.' }
  }

  const { data: auftrag, error: aErr } = await supabase
    .from('auftraege')
    .select('id, titel, angebot_id, lead_id, kunde_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (aErr || !auftrag) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const hwAltRaw = zuAlt.handwerker as unknown
  const hwAlt = (Array.isArray(hwAltRaw) ? hwAltRaw[0] : hwAltRaw) as { name?: string } | null
  const alterName = hwAlt?.name?.trim() || 'Partner'
  const neuName = String(hwNeu.name ?? 'Partner')
  const now = new Date().toISOString()
  const projektName = input.projektName?.trim() || String(auftrag.titel ?? 'Projekt')

  const { error: markAltErr } = await supabase
    .from('auftrag_handwerker')
    .update({ status: 'ersetzt' })
    .eq('id', alteZuweisungId)
  if (markAltErr) return { ok: false, message: markAltErr.message }

  const insertPayload: Record<string, unknown> = {
    auftrag_id: auftragId,
    handwerker_id: neuerHandwerkerId,
    status: 'angefragt',
  }
  if (gewerkId) insertPayload.gewerk_id = gewerkId

  let neueZuweisungId: string | null = null
  const { data: inserted, error: insErr } = await supabase
    .from('auftrag_handwerker')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insErr || !inserted?.id) {
    const { error: fallbackErr } = await supabase
      .from('auftrag_handwerker')
      .update({ handwerker_id: neuerHandwerkerId, status: 'angefragt' })
      .eq('id', alteZuweisungId)
    if (fallbackErr) {
      return { ok: false, message: insErr?.message ?? fallbackErr.message ?? 'Neue Zuweisung fehlgeschlagen.' }
    }
    neueZuweisungId = alteZuweisungId
  } else {
    neueZuweisungId = String(inserted.id)
  }

  let posQuery = supabase
    .from('auftrag_positionen')
    .select('id, leistung_name, aenderung_typ, preis_partner, lohn_fix, material_fix')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', alterHandwerkerId)

  if (gewerkSlug) {
    posQuery = posQuery.eq('gewerk_slug', gewerkSlug)
  } else if (gewerkName) {
    posQuery = posQuery.eq('gewerk_name', gewerkName)
  }

  const { data: posRows, error: posErr } = await posQuery
  if (posErr) return { ok: false, message: posErr.message }

  const posIds: string[] = []
  for (const p of posRows ?? []) {
    const ekFallback = (Number(p.lohn_fix) || 0) + (Number(p.material_fix) || 0)
    const sendPatch = metaBeimSendenAnHandwerker({
      aenderung_typ: (p as { aenderung_typ?: string | null }).aenderung_typ,
    })
    const patch: Record<string, unknown> = {
      handwerker_id: neuerHandwerkerId,
      aenderung_typ: 'neu',
      preis_alt: null,
      ...sendPatch,
    }
    if ((p.preis_partner == null || Number(p.preis_partner) <= 0) && ekFallback > 0) {
      patch.preis_partner = ekFallback
    }
    const { error: upPosErr } = await supabase.from('auftrag_positionen').update(patch).eq('id', p.id as string)
    if (upPosErr) return { ok: false, message: upPosErr.message }
    posIds.push(String(p.id))
  }

  const angebotId = auftrag.angebot_id ? String(auftrag.angebot_id).trim() : ''
  let partnerBenachrichtigt = false

  if (angebotId && gewerkId) {
    const { data: ahAlt } = await supabase
      .from('angebot_handwerker')
      .select('id')
      .eq('angebot_id', angebotId)
      .eq('handwerker_id', alterHandwerkerId)
      .eq('gewerk_id', gewerkId)
      .eq('status', 'abgelehnt')
      .maybeSingle()

    if (ahAlt?.id) {
      const angebotReplace = await replaceAngebotHandwerkerUndSenden({
        angebotId,
        alteZuweisungId: String(ahAlt.id),
        neuerHandwerkerId,
      })
      if (!angebotReplace.ok) return angebotReplace
      partnerBenachrichtigt = true
    }
  }

  if (!partnerBenachrichtigt) {
    const notify = await notifyPartnerUnified({
      handwerkerId: neuerHandwerkerId,
      typ: 'neu',
      projektName,
      link: partnerVorgangLink(auftragId),
      leistungName:
        posRows?.length === 1
          ? String(posRows[0]!.leistung_name ?? '')
          : posRows?.length
            ? `${posRows.length} Leistungen`
            : gewerkName,
      auftragId,
      positionIds: posIds.length ? posIds : undefined,
      aenderungTyp: 'neu',
    })
    if (!notify.ok) return { ok: false, message: notify.error }
  }

  await ensureAngebotHandwerkerGewerkId(supabase, {
    auftragId,
    handwerkerId: neuerHandwerkerId,
    gewerkSlug,
    gewerkName,
  })

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'handwerker_zuweisung',
    titel: 'Partner neu disponiert',
    beschreibung: `${gewerkName}: ${alterName} (abgelehnt) → ${neuName} (angefragt)`,
    handwerker_id: neuerHandwerkerId,
    erstellt_von: uid,
  })

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_redisponiert',
    actorId: uid,
    actorRolle: 'crm',
    kundeId: (auftrag as { kunde_id?: string | null }).kunde_id ?? null,
    payload: {
      alte_zuweisung_id: alteZuweisungId,
      neue_zuweisung_id: neueZuweisungId,
      alter_handwerker_id: alterHandwerkerId,
      neuer_handwerker_id: neuerHandwerkerId,
      gewerk_id: gewerkId,
      position_ids: posIds,
    },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  if (angebotId) {
    revalidatePath(`/angebote/${angebotId}`)
  }
  const leadId = (auftrag as { lead_id?: string | null }).lead_id
  if (leadId) {
    revalidatePath(`/anfragen/${String(leadId)}`)
  }

  return { ok: true }
}

export async function updateAuftragHandwerkerStatus(input: {
  auftragId: string
  zuweisungId: string
  status: AuftragHandwerkerZuweisungStatus
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()

  const { data: row, error: findErr } = await supabase
    .from('auftrag_handwerker')
    .select('id, handwerker_id, gewerk_id, gewerke(name), handwerker(name)')
    .eq('id', input.zuweisungId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
  if (findErr || !row) return { ok: false, message: 'Zuweisung nicht gefunden' }

  const { error } = await supabase
    .from('auftrag_handwerker')
    .update({ status: input.status })
    .eq('id', input.zuweisungId)
  if (error) return { ok: false, message: error.message }

  const gewerkId = (row as { gewerk_id?: string }).gewerk_id
  const handwerkerId = row.handwerker_id as string
  if (gewerkId && handwerkerId) {
    const { data: gw } = await supabase.from('gewerke').select('slug, name').eq('id', gewerkId).maybeSingle()
    let posQuery = supabase
      .from('auftrag_positionen')
      .select('id')
      .eq('auftrag_id', input.auftragId)
      .eq('handwerker_id', handwerkerId)
    if (gw?.slug) {
      posQuery = posQuery.eq('gewerk_slug', gw.slug as string)
    } else if (gw?.name) {
      posQuery = posQuery.eq('gewerk_name', gw.name as string)
    }
    const { data: posRows } = await posQuery
    const now = new Date().toISOString()
    for (const p of posRows ?? []) {
      await supabase
        .from('auftrag_positionen')
        .update({
          handwerker_status: input.status,
          handwerker_angefragt_at: input.status === 'angefragt' ? now : null,
        })
        .eq('id', p.id as string)
    }
  }

  const gwRaw = row.gewerke as unknown
  const gwName = (Array.isArray(gwRaw) ? gwRaw[0] : gwRaw) as { name?: string } | null
  const hwRaw = row.handwerker as unknown
  const hwName = (Array.isArray(hwRaw) ? hwRaw[0] : hwRaw) as { name?: string } | null

  await logHwTimeline(
    input.auftragId,
    `Status geändert: ${hwName?.name ?? 'Handwerker'}`,
    `${gwName?.name ?? 'Gewerk'} → ${input.status}`,
    row.handwerker_id as string
  )

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function updateAuftragPositionHandwerkerStatus(input: {
  auftragId: string
  positionId: string
  status: AuftragHandwerkerZuweisungStatus
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const now = new Date().toISOString()

  const { data: pos, error: posErr } = await supabase
    .from('auftrag_positionen')
    .select('id, auftrag_id, leistung_name, handwerker_id')
    .eq('id', input.positionId)
    .maybeSingle()
  if (posErr) return { ok: false, message: posErr.message }
  if (!pos) return { ok: false, message: 'Position nicht gefunden' }
  if (pos.auftrag_id !== input.auftragId) {
    return { ok: false, message: 'Position gehört nicht zu diesem Auftrag' }
  }

  const { error } = await supabase
    .from('auftrag_positionen')
    .update({
      handwerker_status: input.status,
      handwerker_angefragt_at: input.status === 'angefragt' ? now : null,
    })
    .eq('id', input.positionId)
  if (error) return { ok: false, message: error.message }

  await logHwTimeline(
    input.auftragId,
    `Leistungs-Status geändert`,
    `${pos.leistung_name} → ${input.status}`,
    pos.handwerker_id as string | null
  )

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function updateAuftragHandwerkerDetails(input: {
  auftragId: string
  zuweisungId: string
  vereinbarter_preis?: number | null
  absprachen?: string | null
  notizen?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const patch: Record<string, unknown> = {}
  if (input.vereinbarter_preis !== undefined) patch.vereinbarter_preis = input.vereinbarter_preis
  if (input.absprachen !== undefined) patch.absprachen = input.absprachen?.trim() || null
  if (input.notizen !== undefined) patch.notizen = input.notizen?.trim() || null

  const { error } = await supabase
    .from('auftrag_handwerker')
    .update(patch)
    .eq('id', input.zuweisungId)
    .eq('auftrag_id', input.auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function updateAuftragPositionDetails(input: {
  auftragId: string
  positionId: string
  preis_fix?: number | null
  absprachen?: string | null
  notizen_intern?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmSession()
  if (!gate.ok) return gate

  const supabase = crmDb()
  const patch: Record<string, unknown> = {}
  if (input.preis_fix !== undefined) patch.preis_fix = input.preis_fix
  if (input.absprachen !== undefined) patch.absprachen = input.absprachen?.trim() || null
  if (input.notizen_intern !== undefined) patch.notizen_intern = input.notizen_intern?.trim() || null

  const { error } = await supabase
    .from('auftrag_positionen')
    .update(patch)
    .eq('id', input.positionId)
    .eq('auftrag_id', input.auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

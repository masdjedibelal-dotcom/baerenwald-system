'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { handwerkerAusGeschwisterPositionen, ensureAngebotHandwerkerGewerkId } from '@/lib/auftraege/auftrag-position-handwerker-erbe'
import { metaNeueLeistungMitPartner } from '@/lib/auftraege/partner-vorgang-meta'
import { syncAuftragIstBauprojekt } from '@/lib/auftraege/sync-auftrag-ist-bauprojekt'
import { buildInternFormularSubmittedHtml, sendEmailHtml } from '@/lib/auftraege/emails'
import { getMailBranding } from '@/lib/get-mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import {
  mailAuftragsbestaetigung,
  mailHandwerkerFormular,
  mailUpdateHinweis,
} from '@/lib/mail-templates'
import { AUFTRAG_STATUS_LABELS, FORMULAR_PHASE_LABELS, getPublicAppUrl } from '@/lib/utils'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AuftragDetail, AuftragPosition, AuftragStatus, FormularEintrag, Kunde } from '@/lib/types'
import {
  positionPatchBenoetigtVertragSync,
  syncProjektvertragStilleFireAndForget,
  syncProjektvertragStilleFuerAuftrag,
} from '@/lib/vertraege/sync-projektvertrag-stille'

type ServerRuntime = typeof import('@/lib/server-runtime')

async function serverRuntime(): Promise<ServerRuntime> {
  return import('@/lib/server-runtime')
}

async function fetchAuftragDetail(id: string): Promise<AuftragDetail | null> {
  const { loadAuftragDetail } = await import('@/app/(dashboard)/auftraege/auftraege-data')
  return loadAuftragDetail(id)
}

export async function updateAuftragNotizen(
  auftragId: string,
  notizen: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('auftraege')
    .update({ notizen, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

const FORTSCHRITT_BY_STATUS: Record<AuftragStatus, number> = {
  offen: 35,
  in_arbeit: 65,
  abnahme: 85,
  abgeschlossen: 100,
  storniert: 0,
}

async function setAuftragStatus(
  auftragId: string,
  status: AuftragStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const fortschritt = FORTSCHRITT_BY_STATUS[status] ?? 0
  const patch: Record<string, unknown> = {
    status,
    fortschritt,
    updated_at: new Date().toISOString(),
  }
  if (status === 'abgeschlossen') {
    patch.abnahme_datum = new Date().toISOString().slice(0, 10)
  }
  const { error } = await supabase.from('auftraege').update(patch).eq('id', auftragId)
  if (error) return { ok: false, message: error.message }

  if (status === 'abgeschlossen' || status === 'storniert') {
    const { syncPortalLeadStatusAfterAuftragChange } = await import(
      '@/lib/portal/sync-portal-lead-status'
    )
    await syncPortalLeadStatusAfterAuftragChange({
      auftragId,
      status,
      skipMieterMail: true,
    })
  }

  if (status === 'in_arbeit') {
    const { data: exists } = await supabase
      .from('auftrag_milestones')
      .select('id')
      .eq('auftrag_id', auftragId)
      .eq('titel', 'Arbeiten gestartet')
      .maybeSingle()
    if (!exists) {
      const ins = await supabase.from('auftrag_milestones').insert({
        auftrag_id: auftragId,
        titel: 'Arbeiten gestartet',
        erledigt: true,
        erledigt_at: new Date().toISOString(),
        fuer_kunden_sichtbar: true,
        ist_system: true,
        sort_order: 10,
      })
      if (ins.error) console.warn('[auftrag_milestones]', ins.error.message)
    }
  }

  if (status === 'abgeschlossen') {
    const freigabe = new Date()
    freigabe.setFullYear(freigabe.getFullYear() + 5)
    const freigabeStr = freigabe.toISOString().slice(0, 10)
    const { error: eErr } = await supabase
      .from('einbehalte')
      .update({ freigabe_datum: freigabeStr })
      .eq('auftrag_id', auftragId)
      .eq('status', 'einbehalten')
    if (eErr) console.warn('[einbehalte]', eErr.message)
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'status_change',
    titel: `Status: ${AUFTRAG_STATUS_LABELS[status] ?? status}`,
    erstellt_von: uid,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

export async function updateAuftragStatusFromUi(
  auftragId: string,
  status: AuftragStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  return setAuftragStatus(auftragId, status)
}

export async function updateAuftragFortschrittManual(
  auftragId: string,
  fortschritt: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const v = Math.max(0, Math.min(100, Math.round(fortschritt)))
  const { error } = await supabase
    .from('auftraege')
    .update({ fortschritt: v, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

export async function updateAuftragBetreuer(
  auftragId: string,
  betreuerId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const id = betreuerId?.trim() || null
  const { error } = await supabase
    .from('auftraege')
    .update({ betreuer_id: id, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

export async function updateAuftragProjektFelder(
  auftragId: string,
  patch: {
    titel?: string | null
    start_datum?: string | null
    end_datum?: string | null
    ist_bauprojekt?: boolean | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.titel !== undefined) db.titel = patch.titel?.trim() ? patch.titel.trim() : null
  if (patch.start_datum !== undefined) db.start_datum = patch.start_datum?.trim() || null
  if (patch.end_datum !== undefined) db.end_datum = patch.end_datum?.trim() || null
  if (patch.ist_bauprojekt !== undefined) {
    db.ist_bauprojekt = patch.ist_bauprojekt === true ? true : patch.ist_bauprojekt === false ? false : null
  }
  const { error } = await supabase.from('auftraege').update(db).eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

export async function setAuftragIstBauprojekt(
  auftragId: string,
  istBauprojekt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  return updateAuftragProjektFelder(auftragId, { ist_bauprojekt: istBauprojekt })
}

export async function addAuftragPosition(
  auftragId: string,
  data: {
    gewerk_slug?: string | null
    gewerk_name: string
    gewerk_block_key?: string | null
    projekt_phase?: string | null
    oberkategorie?: string | null
    unterkategorie?: string | null
    leistung_name: string
    beschreibung?: string | null
    einheit?: string | null
    menge?: number | null
    preis_fix?: number | null
    preis_partner?: number | null
    lohn_fix?: number | null
    material_fix?: number | null
    start_datum?: string | null
    end_datum?: string | null
    handwerker_id?: string | null
    handwerker_status?: string | null
  }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()

  const gewerkSlug = data.gewerk_slug?.trim() || null
  if (!gewerkSlug) {
    return { ok: false, message: 'Gewerk (Slug) ist erforderlich — bitte ein konkretes Gewerk wählen.' }
  }
  if (!data.gewerk_name?.trim()) {
    return { ok: false, message: 'Gewerk-Name ist erforderlich.' }
  }

  let handwerkerId = data.handwerker_id !== undefined ? data.handwerker_id?.trim() || null : undefined
  let handwerkerStatus =
    data.handwerker_status !== undefined ? data.handwerker_status?.trim() || null : undefined

  if (handwerkerId === undefined) {
    const { data: siblings } = await supabase
      .from('auftrag_positionen')
      .select('handwerker_id, handwerker_status, gewerk_block_key, gewerk_slug, gewerk_name')
      .eq('auftrag_id', auftragId)

    const erbt = handwerkerAusGeschwisterPositionen(siblings ?? [], {
      gewerk_block_key: data.gewerk_block_key,
      gewerk_slug: data.gewerk_slug,
      gewerk_name: data.gewerk_name,
    })
    if (erbt) {
      handwerkerId = erbt.handwerker_id
      if (handwerkerStatus === undefined) handwerkerStatus = erbt.handwerker_status
    } else {
      handwerkerId = null
    }
  }

  const { data: last } = await supabase
    .from('auftrag_positionen')
    .select('sort_order')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.sort_order ?? 0) + 10
  const partnerMeta =
    handwerkerId != null
      ? metaNeueLeistungMitPartner(
          data.preis_partner ?? null,
          handwerkerStatus ?? 'zugewiesen'
        )
      : {}

  const { data: inserted, error } = await supabase
    .from('auftrag_positionen')
    .insert({
      auftrag_id: auftragId,
      gewerk_slug: gewerkSlug,
      gewerk_name: data.gewerk_name.trim(),
      gewerk_block_key: data.gewerk_block_key?.trim() || null,
      projekt_phase: data.projekt_phase?.trim() || null,
      oberkategorie: data.oberkategorie?.trim() || null,
      unterkategorie: data.unterkategorie?.trim() || null,
      leistung_name: data.leistung_name.trim(),
      beschreibung: data.beschreibung?.trim() || null,
      einheit: data.einheit?.trim() || 'pauschal',
      menge: data.menge ?? 1,
      preis_fix: data.preis_fix ?? null,
      preis_partner: data.preis_partner ?? null,
      lohn_fix: data.lohn_fix ?? null,
      material_fix: data.material_fix ?? null,
      start_datum: data.start_datum?.slice(0, 10) || null,
      end_datum: data.end_datum?.slice(0, 10) || null,
      handwerker_id: handwerkerId ?? null,
      handwerker_status: handwerkerStatus ?? null,
      sort_order: nextOrder,
      ...partnerMeta,
    })
    .select('id')
    .single()
  if (error) return { ok: false, message: error.message }

  if (handwerkerId) {
    await ensureAngebotHandwerkerGewerkId(supabase, {
      auftragId,
      handwerkerId,
      gewerkSlug,
      gewerkName: data.gewerk_name,
    })
  }

  await syncAuftragIstBauprojekt(auftragId)

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, id: inserted.id as string }
}

export async function updateAuftragPosition(
  posId: string,
  auftragId: string,
  data: Partial<
    Pick<
      AuftragPosition,
      | 'gewerk_slug'
      | 'gewerk_name'
      | 'oberkategorie'
      | 'unterkategorie'
      | 'leistung_name'
      | 'beschreibung'
      | 'einheit'
      | 'menge'
      | 'preis_fix'
      | 'lohn_fix'
      | 'material_fix'
      | 'handwerker_id'
    >
  >
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (data.gewerk_slug !== undefined) patch.gewerk_slug = data.gewerk_slug
  if (data.gewerk_name !== undefined) patch.gewerk_name = data.gewerk_name
  if (data.oberkategorie !== undefined) patch.oberkategorie = data.oberkategorie
  if (data.unterkategorie !== undefined) patch.unterkategorie = data.unterkategorie
  if (data.leistung_name !== undefined) patch.leistung_name = data.leistung_name
  if (data.beschreibung !== undefined) patch.beschreibung = data.beschreibung
  if (data.einheit !== undefined) patch.einheit = data.einheit
  if (data.menge !== undefined) patch.menge = data.menge
  if (data.preis_fix !== undefined) patch.preis_fix = data.preis_fix
  if (data.lohn_fix !== undefined) patch.lohn_fix = data.lohn_fix
  if (data.material_fix !== undefined) patch.material_fix = data.material_fix
  if (data.handwerker_id !== undefined) patch.handwerker_id = data.handwerker_id
  if (!Object.keys(patch).length) return { ok: true }

  let vorherHandwerkerId: string | null = null
  if (positionPatchBenoetigtVertragSync(patch)) {
    const { data: current } = await supabase
      .from('auftrag_positionen')
      .select('handwerker_id')
      .eq('id', posId)
      .maybeSingle()
    vorherHandwerkerId = current?.handwerker_id ? String(current.handwerker_id) : null
  }

  const { error } = await supabase.from('auftrag_positionen').update(patch).eq('id', posId)
  if (error) return { ok: false, message: error.message }

  if (positionPatchBenoetigtVertragSync(patch)) {
    const nachherHandwerkerId =
      data.handwerker_id !== undefined
        ? data.handwerker_id
          ? String(data.handwerker_id)
          : null
        : vorherHandwerkerId
    if (vorherHandwerkerId && vorherHandwerkerId !== nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, vorherHandwerkerId)
    }
    if (nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, nachherHandwerkerId)
    }
  }

  await syncAuftragIstBauprojekt(auftragId)
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function deleteAuftragPosition(
  posId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: pos } = await supabase
    .from('auftrag_positionen')
    .select('handwerker_id')
    .eq('id', posId)
    .maybeSingle()

  const { error } = await supabase.from('auftrag_positionen').delete().eq('id', posId)
  if (error) return { ok: false, message: error.message }

  if (pos?.handwerker_id) {
    syncProjektvertragStilleFireAndForget(auftragId, String(pos.handwerker_id))
  } else {
    void syncProjektvertragStilleFuerAuftrag(auftragId)
  }

  await syncAuftragIstBauprojekt(auftragId)
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

function kundenAdresseText(k: Kunde) {
  const parts = [k.adresse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(', ') || '—'
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function logAuftragTimeline(
  input: Parameters<ServerRuntime['insertAuftragTimelineEvent']>[0]
): Promise<void> {
  const { insertAuftragTimelineEvent } = await serverRuntime()
  const r = await insertAuftragTimelineEvent(input)
  if (!r.ok) console.warn('[auftrag_timeline]', r.message)
}

export async function startAuftragArbeit(auftragId: string) {
  const { supabaseAdmin, sendMail, ensureKundenTokenForAuftrag, projektUrlFromToken } =
    await serverRuntime()
  const detail = await fetchAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Daten unvollständig' }
  if (detail.status !== 'offen') {
    return { ok: false as const, message: 'Nur bei Status „Offen“ möglich' }
  }

  const st = await setAuftragStatus(auftragId, 'in_arbeit')
  if (!st.ok) return st

  const rows = detail.auftrag_handwerker ?? []

  const email = detail.kunden.email
  if (email) {
    const token = await ensureKundenTokenForAuftrag(auftragId)
    const projektLink = token ? projektUrlFromToken(token) : getPublicAppUrl()
    const gewerkNamen = rows.map((r) => r.gewerke?.name).filter(Boolean) as string[]
    const branding = await getMailBranding(supabaseAdmin)
    const vorname = detail.kunden.name.trim().split(/\s+/)[0] || detail.kunden.name.trim()
    const tpl = mailAuftragsbestaetigung(
      {
        name: detail.kunden.name.trim(),
        gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
        startDatum: formatDatumDeFromIso(detail.start_datum) ?? '—',
        endDatum: detail.end_datum ? formatDatumDeFromIso(detail.end_datum) : null,
        statusLink: projektLink,
        kundeTyp: detail.kunden.typ,
      },
      branding
    )
    const sent = await sendMail({
      typ: 'auftragsbestaetigung',
      an: email,
      anName: detail.kunden.name,
      betreff: tpl.betreff,
      html: tpl.html,
      kundeId: detail.kunde_id,
      auftragId,
    })
    if (!sent.success) return { ok: false as const, message: sent.error ?? 'E-Mail fehlgeschlagen' }
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'arbeit_gestartet',
    titel: 'Arbeit gestartet',
    beschreibung: email
      ? 'Status „In Arbeit“, Auftragsbestätigung per E-Mail an die Kundin gesendet.'
      : 'Status „In Arbeit“ (keine Kunden-E-Mail hinterlegt).',
    erstellt_von: uid,
    sichtbar_fuer_kunde: Boolean(email),
  })

  return { ok: true as const }
}

export async function setAuftragZurAbnahme(auftragId: string) {
  const { supabaseAdmin, sendMail, ensureKundenTokenForAuftrag, projektUrlFromToken } =
    await serverRuntime()
  const detail = await fetchAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Daten unvollständig' }
  if (detail.status !== 'in_arbeit') {
    return { ok: false as const, message: 'Nur bei Status „In Arbeit“ möglich' }
  }

  const st = await setAuftragStatus(auftragId, 'abnahme')
  if (!st.ok) return st

  const email = detail.kunden.email
  if (email) {
    const token = await ensureKundenTokenForAuftrag(auftragId)
    if (token) {
      const vorname = detail.kunden.name.trim().split(/\s+/)[0] || detail.kunden.name.trim()
      const branding = await getMailBranding(supabaseAdmin)
      const tpl = mailUpdateHinweis(
        {
          name: detail.kunden.name.trim(),
          statusLink: projektUrlFromToken(token),
          kundeTyp: detail.kunden.typ,
        },
        branding
      )
      const sent = await sendMail({
        typ: 'update_hinweis',
        an: email,
        anName: detail.kunden.name,
        betreff: tpl.betreff,
        html: tpl.html,
        kundeId: detail.kunde_id,
        auftragId,
      })
      if (!sent.success) return { ok: false as const, message: sent.error ?? 'E-Mail fehlgeschlagen' }
    }
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'zur_abnahme',
    titel: 'Zur Abnahme',
    beschreibung: email
      ? 'Status „Abnahme“, Kundin per E-Mail informiert.'
      : 'Status „Abnahme“ (keine Kunden-E-Mail hinterlegt).',
    erstellt_von: uid,
    sichtbar_fuer_kunde: Boolean(email),
  })

  return { ok: true as const }
}

/** Setzt Auftrag auf abgeschlossen (Abnahmeprotokoll optional). */
export async function completeAuftragAbnahme(auftragId: string) {
  const detail = await fetchAuftragDetail(auftragId)
  if (!detail) {
    return { ok: false as const, message: 'Auftrag nicht gefunden' }
  }
  if (detail.status !== 'abnahme') {
    return { ok: false as const, message: 'Nur bei Status „Abnahme“ möglich' }
  }

  const st = await setAuftragStatus(auftragId, 'abgeschlossen')
  if (!st.ok) return st

  const abnahmeAm =
    detail.abnahme_datum?.trim() ||
    new Date().toISOString().slice(0, 10)

  const { supabaseAdmin } = await serverRuntime()
  const { registriereGewaehrleistung } = await import('@/lib/org/hv-auftrag-actions')
  const { data: hwLinks } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('handwerker_id')
    .eq('auftrag_id', auftragId)

  const partnerIds = Array.from(
    new Set((hwLinks ?? []).map((r) => r.handwerker_id).filter(Boolean))
  ) as string[]

  if (partnerIds.length) {
    for (const partnerId of partnerIds) {
      const { error: gwErr } = await supabaseAdmin.from('gewaehrleistungen').insert({
        auftrag_id: auftragId,
        partner_id: partnerId,
        abnahme_am: abnahmeAm,
        frist_bis: (() => {
          const f = new Date(abnahmeAm)
          f.setFullYear(f.getFullYear() + 5)
          return f.toISOString().slice(0, 10)
        })(),
        status: 'aktiv',
      })
      if (gwErr) console.error('[gewaehrleistung]', gwErr.message)
    }
  } else {
    await registriereGewaehrleistung(auftragId, abnahmeAm)
  }

  const uid = await getAuthUserId()

  if (detail.lead_id) {
    const { syncPortalLeadStatusAfterAuftragChange } = await import(
      '@/lib/portal/sync-portal-lead-status'
    )
    await syncPortalLeadStatusAfterAuftragChange({
      auftragId,
      status: 'abgeschlossen',
      leadId: detail.lead_id,
      skipMieterMail: true,
    })

    const { writeAuditEvent } = await import('@/lib/audit/write-audit-event')
    await writeAuditEvent({
      entityType: 'lead',
      entityId: detail.lead_id,
      aktion: 'gewaehrleistung_registriert',
      actorId: uid,
      actorRolle: 'crm',
      kundeId: detail.kunde_id ?? null,
      payload: { auftrag_id: auftragId, partner_count: partnerIds.length || 1 },
    })
  }

  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'abnahme_abgeschlossen',
    titel: 'Abnahme abgeschlossen',
    beschreibung: detail.abnahme_protokoll_url
      ? 'Auftrag abgeschlossen (Abnahmeprotokoll liegt vor).'
      : 'Auftrag abgeschlossen (ohne Abnahmeprotokoll).',
    erstellt_von: uid,
    sichtbar_fuer_kunde: true,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true as const }
}

export type CreateFormularEintragInput = {
  auftragId: string
  handwerkerId: string
  gewerkId: string
  templateId: string
  phase: 'vorab' | 'update' | 'abnahme'
  handwerkerEmail: string
}

export async function createFormularEintragUndEmail(input: CreateFormularEintragInput) {
  const { supabaseAdmin, sendMail } = await serverRuntime()
  const token = randomUUID()
  const { data: row, error } = await supabaseAdmin
    .from('formular_eintraege')
    .insert({
      token,
      template_id: input.templateId,
      auftrag_id: input.auftragId,
      handwerker_id: input.handwerkerId,
      gewerk_id: input.gewerkId,
      phase: input.phase,
      ist_entwurf: true,
      daten: {},
      foto_urls: [],
      bemerkungen: null,
      submitted_at: null,
      gespeichert_at: null,
    })
    .select('id')
    .single()

  if (error || !row) return { ok: false as const, message: error?.message ?? 'Speichern fehlgeschlagen' }

  const { data: tpl } = await supabaseAdmin
    .from('formular_templates')
    .select('name')
    .eq('id', input.templateId)
    .maybeSingle()

  const auftrag = await fetchAuftragDetail(input.auftragId)
  const kunde = auftrag?.kunden
  const { data: gw } = await supabaseAdmin
    .from('gewerke')
    .select('name')
    .eq('id', input.gewerkId)
    .maybeSingle()

  const phaseLabel = FORMULAR_PHASE_LABELS[input.phase] ?? input.phase
  const { data: hw } = await supabaseAdmin
    .from('handwerker')
    .select('name')
    .eq('id', input.handwerkerId)
    .maybeSingle()

  const branding = await getMailBranding(supabaseAdmin)
  const link = `${getPublicAppUrl()}/formular/${token}`
  const tabName = `${(tpl?.name as string) ?? 'Formular'} (${phaseLabel} · ${(gw?.name as string) ?? 'Gewerk'})`
  const tplMail = mailHandwerkerFormular(
    {
      name: String(hw?.name ?? 'Guten Tag'),
      tabName,
      auftragName: kunde?.name ?? 'Auftrag',
      adresse: kunde ? kundenAdresseText(kunde) : undefined,
      link,
    },
    branding
  )

  const sent = await sendMail({
    typ: 'handwerker_formular',
    an: input.handwerkerEmail.trim(),
    anName: (hw?.name as string | null) ?? null,
    betreff: tplMail.betreff,
    html: tplMail.html,
    kundeId: auftrag?.kunde_id ?? null,
    auftragId: input.auftragId,
  })
  if (!sent.success) return { ok: false as const, message: sent.error ?? 'E-Mail fehlgeschlagen' }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: input.auftragId,
    typ: 'formular_link_gesendet',
    titel: `Formular-Link: ${(tpl?.name as string) ?? 'Formular'}`,
    beschreibung: `Phase „${phaseLabel}“, E-Mail an Handwerker`,
    handwerker_id: input.handwerkerId,
    erstellt_von: uid,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true as const }
}

export async function notifyInternFormularSubmitted(input: {
  templateName: string
  kunde: string
  auftragId: string
}) {
  const intern = process.env.INTERN_EMAIL
  if (!intern) return { ok: true as const }
  const html = buildInternFormularSubmittedHtml(input)
  return sendEmailHtml({
    to: intern,
    subject: `Formular abgesendet: ${input.templateName}`,
    html,
    typ: 'intern_hinweis',
  })
}

export async function createNachtragEntwurfFromRegiebericht(
  auftragId: string,
  eintragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const { supabaseAdmin } = await serverRuntime()
  const { data: row, error } = await supabaseAdmin
    .from('formular_eintraege')
    .select(
      `
      *,
      formular_templates(id, name, subtyp)
    `
    )
    .eq('id', eintragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (error || !row) return { ok: false, message: error?.message ?? 'Eintrag nicht gefunden' }

  const eintrag = row as FormularEintrag & { formular_templates: { subtyp: string | null } | null }
  if (eintrag.formular_templates?.subtyp !== 'regiebericht') {
    return { ok: false, message: 'Kein Regiebericht' }
  }

  const daten = (eintrag.daten ?? {}) as Record<string, unknown>
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const str = (v: unknown) => (v == null ? '' : String(v))

  const st =
    eintrag.gesamtstunden != null ? Number(eintrag.gesamtstunden) : num(daten.stunden_gesamt)
  const satz = num(daten.stundensatz)
  const lohn = st * satz
  const matDb = eintrag.material_kosten != null ? Number(eintrag.material_kosten) : null
  const mat = matDb != null && !Number.isNaN(matDb) ? matDb : num(daten.material_kosten)
  const net = lohn + mat
  const brutto = net * 1.19

  const beschreibung = str(daten.beschreibung)
  const grundKurz = `Regiebericht ${str(daten.datum)}: ${beschreibung.slice(0, 280)}`

  const lohnNettoUnit = st > 0 ? Math.round((lohn / st) * 100) / 100 : lohn
  const matNettoUnit = st > 0 ? Math.round((mat / st) * 100) / 100 : mat
  const netUnit = Math.round((lohnNettoUnit + matNettoUnit) * 100) / 100
  const position = {
    id: randomUUID(),
    gewerk_id: '',
    gewerk_name: 'Regie / Zusatz',
    leistung: 'Regiebericht — Zusatzaufwand',
    beschreibung: beschreibung || grundKurz,
    lohn_netto: lohnNettoUnit,
    material_netto: matNettoUnit,
    gesamt_min: netUnit,
    gesamt_max: netUnit,
    menge: st,
    einheit: 'h',
    preis_typ: 'fix' as const,
  }

  const { error: insErr } = await supabaseAdmin.from('nachtraege').insert({
    auftrag_id: auftragId,
    grund: grundKurz,
    positionen: [position],
    gesamt_min: brutto,
    gesamt_max: brutto,
    status: 'entwurf',
  })

  if (insErr) return { ok: false, message: insErr.message }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'nachtrag_entwurf',
    titel: 'Nachtrag aus Regiebericht',
    beschreibung: grundKurz.slice(0, 500),
    erstellt_von: uid,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

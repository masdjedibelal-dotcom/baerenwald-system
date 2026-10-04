'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { createClient } from '@/lib/supabase-server'
import { getMailBranding } from '@/lib/get-mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import {
  mailAuftragsbestaetigung,mailUpdateHinweis
} from '@/lib/mail-templates'
import { AUFTRAG_STATUS_LABELS,getPublicAppUrl } from '@/lib/utils'
import type { AuftragDetail,AuftragStatus } from '@/lib/types'

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
  if (error) logDbError('app/auftraege/actions:auftraege', error)
  if (error) return { ok: false, message: error.message }
  revalidateAuftragDetail(auftragId)
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
  status: AuftragStatus,
  opts?: { timelineBeschreibung?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db
  const fortschritt = FORTSCHRITT_BY_STATUS[status] ?? 0
  const patch: Record<string, unknown> = {
    status,
    fortschritt,
    updated_at: new Date().toISOString(),
  }
  // Abschluss ohne Abnahme darf abnahme_datum nicht setzen — nur wenn Protokoll existiert.
  if (status === 'abgeschlossen') {
    const [{ data: aufRow }, { data: protRow }] = await Promise.all([
      supabase
        .from('auftraege')
        .select('abnahme_protokoll_url, abnahme_datum')
        .eq('id', auftragId)
        .maybeSingle(),
      supabase
        .from('auftrag_abnahmeprotokolle')
        .select('abnahme_datum')
        .eq('auftrag_id', auftragId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    const hasProtokoll =
      Boolean((aufRow?.abnahme_protokoll_url as string | null)?.trim()) ||
      Boolean(protRow?.abnahme_datum)
    if (hasProtokoll) {
      const fromProt = (protRow?.abnahme_datum as string | null)?.trim()?.slice(0, 10)
      const fromAuf = (aufRow?.abnahme_datum as string | null)?.trim()?.slice(0, 10)
      patch.abnahme_datum = fromProt || fromAuf || new Date().toISOString().slice(0, 10)
    }
  }
  const { error } = await supabase.from('auftraege').update(patch).eq('id', auftragId)
  if (error) logDbError('app/auftraege/actions:auftraege', error)
  if (error) return { ok: false, message: error.message }

  if (
    status === 'abgeschlossen' ||
    status === 'storniert' ||
    status === 'in_arbeit' ||
    status === 'offen' ||
    status === 'abnahme'
  ) {
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
    const { data: exists, error } = await supabase
      .from('auftrag_milestones')
      .select('id')
      .eq('auftrag_id', auftragId)
      .eq('titel', 'Arbeiten gestartet')
      .maybeSingle()
    if (error) logDbError('app/auftraege/actions:auftrag_milestones', error)
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
    if (eErr) logDbError('app/auftraege/actions:einbehalte', eErr)
    if (eErr) console.warn('[einbehalte]', eErr.message)
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'status_change',
    titel: `Status: ${AUFTRAG_STATUS_LABELS[status] ?? status}`,
    beschreibung: opts?.timelineBeschreibung,
    erstellt_von: uid,
  })

  revalidateAuftragDetail(auftragId)
  return { ok: true }
}

export async function updateAuftragStatusFromUi(
  auftragId: string,
  status: AuftragStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  return setAuftragStatus(auftragId, status)
}

/**
 * Nach aktiver Vollrechnung Auftrag auf „abgeschlossen“ setzen.
 * Schlussrechnung, Abschläge und Gutschriften ändern den Auftragsstatus nicht —
 * der Auftrag bleibt der Stamm (Satellit-Modell).
 */
export async function completeAuftragNachEndabrechnung(input: {
  auftragId: string | null | undefined
  rechnungArt: string | null | undefined
  rechnungsnummer?: string | null
  belegTyp?: string | null
}): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const auftragId = input.auftragId?.trim()
  if (!auftragId) return { ok: true, changed: false }

  const beleg = (input.belegTyp ?? 'rechnung').trim().toLowerCase()
  if (beleg === 'gutschrift') return { ok: true, changed: false }

  const art = (input.rechnungArt ?? 'voll').trim().toLowerCase()
  // Schlussrechnung: Auftrag bleibt offen/in Arbeit — nur Vollrechnung schließt ab.
  if (art !== 'voll') return { ok: true, changed: false }

  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db
  const { data: row, error } = await supabase
    .from('auftraege')
    .select('id, status')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/actions:auftraege', error)

  if (error) return { ok: false, message: error.message }
  if (!row) return { ok: true, changed: false }

  const st = String(row.status ?? '').trim().toLowerCase()
  if (st === 'abgeschlossen' || st === 'storniert') return { ok: true, changed: false }

  const nr = input.rechnungsnummer?.trim()
  const res = await setAuftragStatus(auftragId, 'abgeschlossen', {
    timelineBeschreibung: nr
      ? `Automatisch nach Vollrechnung ${nr}.`
      : `Automatisch nach Vollrechnung.`,
  })
  if (!res.ok) return res

  return { ok: true, changed: true }
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
  if (error) logDbError('app/auftraege/actions:auftraege', error)
  if (error) return { ok: false, message: error.message }
  revalidateAuftragDetail(auftragId)
  return { ok: true }
}

export async function updateAuftragProjektFelder(
  auftragId: string,
  patch: {
    titel?: string | null
    start_datum?: string | null
    end_datum?: string | null
    ist_bauprojekt?: boolean | null
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
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
  if (patch.ist_wiederkehrend !== undefined) {
    const ist = patch.ist_wiederkehrend === true
    db.ist_wiederkehrend = ist
    db.wiederkehr_turnus = ist ? patch.wiederkehr_turnus?.trim() || null : null
  }
  const { error } = await supabase.from('auftraege').update(db).eq('id', auftragId)
  if (error) logDbError('app/auftraege/actions:auftraege', error)
  if (error) return { ok: false, message: error.message }
  revalidateAuftragDetail(auftragId)
  return { ok: true }
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

export async function startAuftragArbeit(
  auftragId: string,
  options?: { notifyKunde?: boolean }
) {
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
  const notifyKunde = options?.notifyKunde === true
  const email = notifyKunde ? detail.kunden.email : null
  let mailGesendet = false
  let mailLogId: string | null = null

  if (email) {
    const token = await ensureKundenTokenForAuftrag(auftragId)
    const projektLink = token ? projektUrlFromToken(token) : getPublicAppUrl()
    const gewerkNamen = rows.map((r) => r.gewerke?.name).filter(Boolean) as string[]
    const branding = await getMailBranding(supabaseAdmin)
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
    if (!sent.success) {
      console.warn('[startAuftragArbeit] Mail:', sent.error)
    } else {
      mailGesendet = true
      mailLogId = sent.emailLogId ?? null
    }
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'arbeit_gestartet',
    titel: 'Arbeit gestartet',
    beschreibung: mailGesendet
      ? 'Status „In Arbeit“, Auftragsbestätigung per E-Mail an die Kundin gesendet.'
      : 'Status „In Arbeit“ (ohne Kunden-Mail).',
    erstellt_von: uid,
    sichtbar_fuer_kunde: mailGesendet,
    email_log_id: mailLogId,
  })

  return { ok: true as const }
}

export async function setAuftragZurAbnahme(
  auftragId: string,
  options?: { notifyKunde?: boolean }
) {
  const { supabaseAdmin, sendMail, ensureKundenTokenForAuftrag, projektUrlFromToken } =
    await serverRuntime()
  const detail = await fetchAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Daten unvollständig' }
  if (detail.status !== 'in_arbeit') {
    return { ok: false as const, message: 'Nur bei Status „In Arbeit“ möglich' }
  }

  const st = await setAuftragStatus(auftragId, 'abnahme')
  if (!st.ok) return st

  const notifyKunde = options?.notifyKunde === true
  const email = notifyKunde ? detail.kunden.email : null
  let mailGesendet = false
  let mailLogId: string | null = null

  if (email) {
    const token = await ensureKundenTokenForAuftrag(auftragId)
    if (token) {
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
      if (!sent.success) {
        console.warn('[setAuftragZurAbnahme] Mail:', sent.error)
      } else {
        mailGesendet = true
        mailLogId = sent.emailLogId ?? null
      }
    }
  }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'zur_abnahme',
    titel: 'Zur Abnahme',
    beschreibung: mailGesendet
      ? 'Status „Abnahme“, Kundin per E-Mail informiert.'
      : 'Status „Abnahme“ (ohne Kunden-Mail).',
    erstellt_von: uid,
    sichtbar_fuer_kunde: mailGesendet,
    email_log_id: mailLogId,
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
  const { data: hwLinks, error } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('handwerker_id')
    .eq('auftrag_id', auftragId)
  if (error) logDbError('app/auftraege/actions:auftrag_handwerker', error)

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
      if (gwErr) logDbError('app/auftraege/actions:gewaehrleistungen', gwErr)
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

  revalidateAuftragDetail(auftragId)
  return { ok: true as const }
}

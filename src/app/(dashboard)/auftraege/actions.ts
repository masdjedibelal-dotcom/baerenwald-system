'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildAbnahmePdfZusatz } from '@/lib/auftraege/abnahme-protokoll-zusatz'
import { renderAbnahmeProtokollPdfBuffer } from '@/lib/pdf/abnahme-protokoll-pdf'
import { buildInternFormularSubmittedHtml, sendEmailHtml } from '@/lib/auftraege/emails'
import { getMailBranding } from '@/lib/mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import {
  mailAbnahme,
  mailAuftragsbestaetigung,
  mailHandwerkerFormular,
  mailUpdateHinweis,
} from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { ensureKundenTokenForAuftrag, projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { AUFTRAG_STATUS_LABELS, FORMULAR_PHASE_LABELS, getPublicAppUrl } from '@/lib/utils'
import { saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import type {
  AngebotPosition,
  AuftragDetail,
  AuftragPosition,
  AuftragStatus,
  AuftragTimelineEvent,
  FormularEintrag,
  FormularTemplate,
  Kunde,
} from '@/lib/types'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'

import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

export async function loadAuftragDetail(id: string): Promise<AuftragDetail | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftraege')
    .select(
      `
      *,
      kunden(*),
      angebote(*),
      auftrag_handwerker(
        *,
        handwerker(id, name, email, telefon, firma),
        gewerke(id, name, slug)
      ),
      formular_eintraege(
        *,
        formular_templates(id, name, phase, typ, subtyp, felder, gewerk_id, aktiv),
        handwerker(name),
        gewerke(name)
      ),
      kalender_termine(*),
      auftrag_timeline(
        id, auftrag_id, typ, titel, beschreibung, foto_urls,
        erstellt_von, handwerker_id, sichtbar_fuer_kunde,
        fuer_kunde_freigegeben, freigegeben_at, created_at
      ),
      punch_list(
        id, auftrag_id, gewerk_id, beschreibung, status, prioritaet,
        foto_urls, foto_nachher_urls, behoben_at, behoben_von, created_at,
        gewerke(id, name, slug)
      ),
      nachtraege(
        id, auftrag_id, token, grund, beschreibung, positionen, gesamt_min, gesamt_max,
        status, gesendet_at, akzeptiert_at, abgelehnt_at,
        kunde_bestaetigt_at, kunde_ip, handwercher_bestaetigt, handwercher_bestaetigt_at, abgelehnt_grund,
        created_at
      ),
      vor_baubeginn_protokolle(*),
      baustopps(*),
      einbehalte(
        *,
        handwerker(id, name, firma),
        buergschaften(*)
      ),
      eingangsrechnungen(*),
      auftrag_milestones(*),
      hw_formular_tabs(
        *,
        hw_formular_einreichungen(*)
      ),
      auftrag_positionen(
        *,
        handwerker(id, name)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AuftragDetail & { angebote?: { positionen?: unknown } | null }
  const ang = row.angebote
  const tl = [...(row.auftrag_timeline ?? [])] as AuftragTimelineEvent[]
  tl.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const milestones = [...(row.auftrag_milestones ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const positionenSorted = [...(row.auftrag_positionen ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  ) as AuftragPosition[]
  return {
    ...row,
    auftrag_timeline: tl,
    auftrag_milestones: milestones,
    auftrag_positionen: positionenSorted,
    angebote: ang
      ? {
          ...ang,
          positionen: parsePositionen(ang.positionen),
        }
      : null,
  }
}

async function loadAuftragDetailAdmin(id: string): Promise<AuftragDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      *,
      kunden(*),
      angebote(*),
      auftrag_handwerker(
        *,
        handwerker(id, name, email, telefon, firma),
        gewerke(id, name, slug)
      ),
      formular_eintraege(
        *,
        formular_templates(id, name, phase, typ, subtyp, felder, gewerk_id, aktiv),
        handwerker(name),
        gewerke(name)
      ),
      kalender_termine(*),
      auftrag_timeline(
        id, auftrag_id, typ, titel, beschreibung, foto_urls,
        erstellt_von, handwerker_id, sichtbar_fuer_kunde,
        fuer_kunde_freigegeben, freigegeben_at, created_at
      ),
      punch_list(
        id, auftrag_id, gewerk_id, beschreibung, status, prioritaet,
        foto_urls, foto_nachher_urls, behoben_at, behoben_von, created_at,
        gewerke(id, name, slug)
      ),
      nachtraege(
        id, auftrag_id, token, grund, beschreibung, positionen, gesamt_min, gesamt_max,
        status, gesendet_at, akzeptiert_at, abgelehnt_at,
        kunde_bestaetigt_at, kunde_ip, handwercher_bestaetigt, handwercher_bestaetigt_at, abgelehnt_grund,
        created_at
      ),
      vor_baubeginn_protokolle(*),
      baustopps(*),
      einbehalte(
        *,
        handwerker(id, name, firma),
        buergschaften(*)
      ),
      eingangsrechnungen(*),
      auftrag_milestones(*),
      hw_formular_tabs(
        *,
        hw_formular_einreichungen(*)
      ),
      auftrag_positionen(
        *,
        handwerker(id, name)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AuftragDetail & { angebote?: { positionen?: unknown } | null }
  const ang = row.angebote
  const tl = [...(row.auftrag_timeline ?? [])] as AuftragTimelineEvent[]
  tl.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const milestones = [...(row.auftrag_milestones ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const positionenSorted = [...(row.auftrag_positionen ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  ) as AuftragPosition[]
  return {
    ...row,
    auftrag_timeline: tl,
    auftrag_milestones: milestones,
    auftrag_positionen: positionenSorted,
    angebote: ang
      ? {
          ...ang,
          positionen: parsePositionen(ang.positionen),
        }
      : null,
  }
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

    const kal = await saveKalenderTermin({
      titel: 'Einbehalt prüfen',
      typ: 'sonstiges',
      datum: freigabeStr,
      uhrzeit_von: null,
      uhrzeit_bis: null,
      adresse: null,
      beschreibung: 'Automatisch: Einbehalte prüfen (nach Auftragsabschluss).',
      lead_id: null,
      auftrag_id: auftragId,
    })
    if (!kal.ok) console.warn('[kalender]', kal.message)
    revalidatePath('/kalender')
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

export async function updateAuftragProjektFelder(
  auftragId: string,
  patch: { titel?: string | null; start_datum?: string | null; end_datum?: string | null }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const db: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.titel !== undefined) db.titel = patch.titel?.trim() ? patch.titel.trim() : null
  if (patch.start_datum !== undefined) db.start_datum = patch.start_datum?.trim() || null
  if (patch.end_datum !== undefined) db.end_datum = patch.end_datum?.trim() || null
  const { error } = await supabase.from('auftraege').update(db).eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true }
}

export async function addAuftragPosition(
  auftragId: string,
  data: {
    gewerk_slug?: string | null
    gewerk_name: string
    oberkategorie?: string | null
    unterkategorie?: string | null
    leistung_name: string
    beschreibung?: string | null
    einheit?: string | null
    menge?: number | null
    preis_fix?: number | null
    lohn_fix?: number | null
    material_fix?: number | null
    handwerker_id?: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: last } = await supabase
    .from('auftrag_positionen')
    .select('sort_order')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (last?.sort_order ?? 0) + 10
  const { error } = await supabase.from('auftrag_positionen').insert({
    auftrag_id: auftragId,
    gewerk_slug: data.gewerk_slug?.trim() || null,
    gewerk_name: data.gewerk_name.trim(),
    oberkategorie: data.oberkategorie?.trim() || null,
    unterkategorie: data.unterkategorie?.trim() || null,
    leistung_name: data.leistung_name.trim(),
    beschreibung: data.beschreibung?.trim() || null,
    einheit: data.einheit?.trim() || 'pauschal',
    menge: data.menge ?? 1,
    preis_fix: data.preis_fix ?? null,
    lohn_fix: data.lohn_fix ?? null,
    material_fix: data.material_fix ?? null,
    handwerker_id: data.handwerker_id?.trim() || null,
    sort_order: nextOrder,
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
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
  const { error } = await supabase.from('auftrag_positionen').update(patch).eq('id', posId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function deleteAuftragPosition(
  posId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('auftrag_positionen').delete().eq('id', posId)
  if (error) return { ok: false, message: error.message }
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
  input: Parameters<typeof insertAuftragTimelineEvent>[0]
): Promise<void> {
  const r = await insertAuftragTimelineEvent(input)
  if (!r.ok) console.warn('[auftrag_timeline]', r.message)
}

export async function startAuftragArbeit(auftragId: string) {
  const detail = await loadAuftragDetail(auftragId)
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
        name: vorname,
        gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
        startDatum: formatDatumDeFromIso(detail.start_datum) ?? '—',
        endDatum: detail.end_datum ? formatDatumDeFromIso(detail.end_datum) : null,
        statusLink: projektLink,
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
  const detail = await loadAuftragDetail(auftragId)
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
      const tpl = mailUpdateHinweis({ name: vorname, statusLink: projektUrlFromToken(token) }, branding)
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

export async function persistAbnahmeProtokollForAuftrag(auftragId: string): Promise<
  { ok: true; buffer: Buffer; publicUrl: string } | { ok: false; message: string }
> {
  const detail = await loadAuftragDetailAdmin(auftragId)
  if (!detail?.kunden) return { ok: false, message: 'Auftrag/Kunde nicht gefunden' }

  const kunde = detail.kunden
  const pos = parsePositionen(detail.angebote?.positionen ?? [])
  const hwZeilen = (detail.auftrag_handwerker ?? []).map((r) => {
    const n = r.handwerker?.name ?? '—'
    const g = r.gewerke?.name ?? '—'
    const f = r.handwerker?.firma ?? ''
    return `${n} — ${g}${f ? ` (${f})` : ''}`
  })

  const abnahmeEintraege = (detail.formular_eintraege ?? []).filter(
    (e) => e.phase === 'abnahme' && e.submitted_at
  ) as FormularEintrag[]

  const fotoUrls: string[] = []
  for (const e of detail.formular_eintraege ?? []) {
    for (const u of e.foto_urls ?? []) {
      if (u && !fotoUrls.includes(u)) fotoUrls.push(u)
    }
  }
  for (const vb of detail.vor_baubeginn_protokolle ?? []) {
    for (const u of vb.foto_urls ?? []) {
      if (u && !fotoUrls.includes(u)) fotoUrls.push(u)
    }
  }

  const abnahmeDatum = new Date().toLocaleDateString('de-DE')
  const shortId = auftragId.slice(0, 8)
  const zusatz = buildAbnahmePdfZusatz(detail)

  let buffer: Buffer
  try {
    buffer = Buffer.from(
      await renderAbnahmeProtokollPdfBuffer({
        kunde,
        auftragIdShort: shortId,
        abnahmeDatum,
        positionen: pos,
        handwerkerZeilen: hwZeilen,
        abnahmeEintraege,
        fotoUrls,
        zusatz,
      })
    )
  } catch {
    try {
      buffer = Buffer.from(
        await renderAbnahmeProtokollPdfBuffer({
          kunde,
          auftragIdShort: shortId,
          abnahmeDatum,
          positionen: pos,
          handwerkerZeilen: hwZeilen,
          abnahmeEintraege,
          fotoUrls: [],
          zusatz,
        })
      )
    } catch (e2) {
      return {
        ok: false,
        message: e2 instanceof Error ? e2.message : 'PDF fehlgeschlagen',
      }
    }
  }

  const path = `${auftragId}/${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: dbErr } = await supabaseAdmin
    .from('auftraege')
    .update({ abnahme_protokoll_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', auftragId)

  if (dbErr) return { ok: false, message: dbErr.message }

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, buffer, publicUrl }
}

export async function completeAuftragAbnahme(auftragId: string) {
  const detail = await loadAuftragDetail(auftragId)
  if (!detail?.kunden?.email) {
    return { ok: false as const, message: 'Kunden-E-Mail fehlt' }
  }
  if (detail.status !== 'abnahme') {
    return { ok: false as const, message: 'Nur bei Status „Abnahme“ möglich' }
  }

  const pdf = await persistAbnahmeProtokollForAuftrag(auftragId)
  if (!pdf.ok) return pdf

  const st = await setAuftragStatus(auftragId, 'abgeschlossen')
  if (!st.ok) return st

  const branding = await getMailBranding(supabaseAdmin)
  const gw = (detail.auftrag_handwerker ?? [])
    .map((r) => r.gewerke?.name)
    .filter((n): n is string => Boolean(n))
  const vorname = detail.kunden.name.trim().split(/\s+/)[0] || detail.kunden.name.trim()
  const tpl = mailAbnahme(
    {
      name: vorname,
      gewerke: gw.length ? gw : ['—'],
      abnahmeDatum: new Date().toLocaleDateString('de-DE'),
    },
    branding
  )
  const mail = await sendMail({
    typ: 'abnahme',
    an: detail.kunden.email,
    anName: detail.kunden.name,
    betreff: tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: `abnahme-${auftragId}.pdf`,
    kundeId: detail.kunde_id ?? null,
    auftragId,
  })
  if (!mail.success) return { ok: false as const, message: mail.error ?? 'E-Mail fehlgeschlagen' }

  const uid = await getAuthUserId()
  await logAuftragTimeline({
    auftrag_id: auftragId,
    typ: 'abnahme_abgeschlossen',
    titel: 'Abnahme abgeschlossen',
    beschreibung: 'Auftrag abgeschlossen, Abnahmeprotokoll per E-Mail versendet.',
    erstellt_von: uid,
    sichtbar_fuer_kunde: true,
  })

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

  const auftrag = await loadAuftragDetailAdmin(input.auftragId)
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

export async function listFormularTemplates(): Promise<FormularTemplate[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('formular_templates')
    .select('*')
    .eq('aktiv', true)
    .order('name')
  return (data ?? []) as FormularTemplate[]
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

export type EmailLogRow = {
  id: string
  typ: string
  an_email: string
  an_name: string | null
  betreff: string
  status: string | null
  fehler_nachricht: string | null
  created_at: string
}

export async function loadEmailLogForAuftrag(auftragId: string): Promise<EmailLogRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('email_log')
    .select('id, typ, an_email, an_name, betreff, status, fehler_nachricht, created_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[loadEmailLogForAuftrag]', error.message)
    return []
  }
  return (data ?? []) as EmailLogRow[]
}

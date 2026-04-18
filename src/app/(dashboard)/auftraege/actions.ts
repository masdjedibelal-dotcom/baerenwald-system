'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildAbnahmePdfZusatz } from '@/lib/auftraege/abnahme-protokoll-zusatz'
import { renderAbnahmeProtokollPdfBuffer } from '@/lib/pdf/abnahme-protokoll-pdf'
import {
  buildAbnahmeProtokollMailHtml,
  buildAuftragsbestaetigungHtml,
  buildFormularLinkHtml,
  buildInternFormularSubmittedHtml,
  sendEmailHtml,
} from '@/lib/auftraege/emails'
import * as emailTemplates from '@/lib/email-templates'
import { ensureKundenTokenForAuftrag, projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { FORMULAR_PHASE_LABELS } from '@/lib/utils'
import type {
  AngebotPosition,
  AuftragDetail,
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
      eingangsrechnungen(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AuftragDetail & { angebote?: { positionen?: unknown } | null }
  const ang = row.angebote
  const tl = [...(row.auftrag_timeline ?? [])] as AuftragTimelineEvent[]
  tl.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return {
    ...row,
    auftrag_timeline: tl,
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
      eingangsrechnungen(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AuftragDetail & { angebote?: { positionen?: unknown } | null }
  const ang = row.angebote
  const tl = [...(row.auftrag_timeline ?? [])] as AuftragTimelineEvent[]
  tl.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return {
    ...row,
    auftrag_timeline: tl,
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

async function setAuftragStatus(
  auftragId: string,
  status: AuftragStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, string> = { status, updated_at: new Date().toISOString() }
  if (status === 'abgeschlossen') {
    patch.abnahme_datum = new Date().toISOString().slice(0, 10)
  }
  const { error } = await supabase.from('auftraege').update(patch).eq('id', auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
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
  const gewerkParts = rows
    .map((r) => `${r.gewerke?.name ?? 'Gewerk'}: ${r.handwerker?.name ?? '—'}`)
    .filter(Boolean)
  const gewerkeHtml = `<ul>${gewerkParts.map((p) => `<li>${p}</li>`).join('')}</ul>`
  const hwLines = rows
    .map((r) => `${r.handwerker?.name ?? '—'} (${r.gewerke?.name ?? '—'})`)
    .join('<br/>')

  const email = detail.kunden.email
  if (email) {
    const token = await ensureKundenTokenForAuftrag(auftragId)
    const projektLink = token ? projektUrlFromToken(token) : null
    const html = buildAuftragsbestaetigungHtml({
      kunde: detail.kunden,
      gewerkeHtml,
      handwerkerHtml: hwLines || '—',
      startDatum: detail.start_datum,
      projektLink,
    })
    const sent = await sendEmailHtml({
      to: email,
      subject: 'Ihr Auftrag wurde bestätigt — Bärenwald München',
      html,
    })
    if (!sent.ok) return sent
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
      const html = emailTemplates.emailUpdateHinweis({
        name: vorname,
        link: projektUrlFromToken(token),
      })
      const sent = await sendEmailHtml({
        to: email,
        subject: 'Update zu Ihrem Projekt — Bärenwald München',
        html,
      })
      if (!sent.ok) return sent
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

  const html = buildAbnahmeProtokollMailHtml({ kunde: detail.kunden })
  const mail = await sendEmailHtml({
    to: detail.kunden.email,
    subject: 'Abnahmeprotokoll — Bärenwald München',
    html,
    attachments: [{ filename: `abnahme-${auftragId}.pdf`, content: pdf.buffer }],
  })
  if (!mail.ok) return mail

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
  const html = buildFormularLinkHtml({
    templateName: (tpl?.name as string) ?? 'Formular',
    phaseLabel,
    kundenname: kunde?.name ?? '—',
    adresse: kunde ? kundenAdresseText(kunde) : '—',
    gewerkName: (gw?.name as string) ?? '—',
    token,
  })

  const sent = await sendEmailHtml({
    to: input.handwerkerEmail.trim(),
    subject: `Formular: ${(tpl?.name as string) ?? 'Formular'} — ${kunde?.name ?? 'Kunde'}`,
    html,
  })
  if (!sent.ok) return sent

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

  const position = {
    id: randomUUID(),
    gewerk_id: '',
    gewerk_name: 'Regie / Zusatz',
    leistung: 'Regiebericht — Zusatzaufwand',
    beschreibung: beschreibung || grundKurz,
    lohn_min: lohn,
    lohn_max: lohn,
    material_min: mat,
    material_max: mat,
    gesamt_min: brutto,
    gesamt_max: brutto,
    menge: st,
    einheit: 'h',
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

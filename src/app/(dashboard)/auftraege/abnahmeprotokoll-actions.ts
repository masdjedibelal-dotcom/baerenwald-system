'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailText, type MailAnrede } from '@/lib/mail/anrede'
import { mailHtmlBase } from '@/lib/mail-templates'
import { renderAbnahmeProtokollPdfBuffer } from '@/lib/auftraege/render-abnahme-protokoll-pdf'
import {
  abnahmePunkteStatistik,
  type AbnahmeMangelStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import {
  appendMangelVerlauf,
  applyPunktStatusFromMaengel,
  countOffeneMaengel,
  mergeMaengelFromPunkte,
  normalizeMaengel,
} from '@/lib/auftraege/abnahme-maengel-helpers'
import { syncPunchListFromAbnahmeMaengel } from '@/lib/auftraege/sync-abnahme-punch-list'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { sendMail } from '@/lib/mail-service'

async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function prepareAbnahmePayload(input: {
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
}): { punkte: AbnahmePunkt[]; maengel: AbnahmeMangel[] } {
  const maengel = normalizeMaengel(
    input.maengel.length > 0 ? input.maengel : mergeMaengelFromPunkte(input.punkte, [])
  )
  const punkte = applyPunktStatusFromMaengel(input.punkte, maengel)
  return { punkte, maengel }
}

async function afterAbnahmePersist(input: {
  auftragId: string
  protokollId: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  prevOffeneMaengel: number
  beschreibungExtra?: string
}): Promise<void> {
  const maengel = normalizeMaengel(input.maengel)
  const offen = countOffeneMaengel(maengel)
  const uid = await getAuthUserId()

  try {
    await syncPunchListFromAbnahmeMaengel({
      auftragId: input.auftragId,
      protokollId: input.protokollId,
      punkte: input.punkte,
      maengel,
    })
  } catch (e) {
    console.warn('[syncPunchListFromAbnahmeMaengel]', e)
  }

  if (offen > 0 && input.prevOffeneMaengel === 0) {
    await insertAuftragTimelineEvent({
      auftrag_id: input.auftragId,
      typ: 'mangel_neu',
      titel: `${offen} Mangel${offen === 1 ? '' : 'e'} erfasst`,
      beschreibung:
        input.beschreibungExtra ??
        'Abnahme mit offenen Mängeln — Nacharbeit im Auftrag unter „Mängel bearbeiten“.',
      erstellt_von: uid,
      sichtbar_fuer_kunde: false,
    })
  }
}

async function persistProtokollPdfForRow(
  auftragId: string,
  protokollId: string,
  input: {
    abnahmeDatum: string
    punkte: AbnahmePunkt[]
    maengel: AbnahmeMangel[]
    notizen: string | null
    protokollTyp?: string
  }
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const built = await buildPdfBuffer({
    auftragId,
    abnahmeDatum: input.abnahmeDatum,
    punkte: input.punkte,
    maengel: input.maengel,
    notizen: input.notizen,
  })
  if (!built.ok) return built

  const stored = await persistPdf(auftragId, built.buffer)
  if (!stored.ok) return stored

  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({
      abnahme_datum: input.abnahmeDatum.slice(0, 10),
      notizen: input.notizen?.trim() || null,
      punkte: input.punkte,
      maengel: input.maengel,
      pdf_url: stored.publicUrl,
      protokoll_typ: input.protokollTyp ?? 'nachabnahme',
      updated_at: new Date().toISOString(),
    })
    .eq('id', protokollId)

  if (error) return { ok: false, message: error.message }

  await supabaseAdmin
    .from('auftraege')
    .update({
      abnahme_protokoll_url: stored.publicUrl,
      abnahme_datum: input.abnahmeDatum.slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)

  return { ok: true, publicUrl: stored.publicUrl }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function buildPdfBuffer(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
}) {
  const detail = await loadAuftragDetail(input.auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Auftrag/Kunde nicht gefunden' }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderAbnahmeProtokollPdfBuffer(detail, firm, {
    abnahmeDatum: input.abnahmeDatum,
    punkte: input.punkte,
    maengel: input.maengel,
    notizen: input.notizen,
  })
  return { ok: true as const, buffer, detail }
}

async function persistPdf(auftragId: string, buffer: Buffer): Promise<
  { ok: true; publicUrl: string } | { ok: false; message: string }
> {
  const path = `${auftragId}/abnahme-${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('protokolle')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('protokolle').getPublicUrl(path)
  return { ok: true, publicUrl: pub.publicUrl }
}

export async function downloadAbnahmeprotokollPdf(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
}): Promise<
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; message: string }
> {
  const built = await buildPdfBuffer(input)
  if (!built.ok) return built
  const filename = `Abnahmeprotokoll-${formatAuftragsNr(built.detail)}.pdf`
  return {
    ok: true,
    pdfBase64: built.buffer.toString('base64'),
    filename,
  }
}

function defaultAbnahmeprotokollNachricht(anrede: MailAnrede): string {
  return mailText(
    anrede,
    'wir haben das Abnahmeprotokoll zu deinem Projekt erstellt. Das vollständige Protokoll findest du im PDF-Anhang.',
    'wir haben das Abnahmeprotokoll zu Ihrem Projekt erstellt. Das vollständige Protokoll finden Sie im PDF-Anhang.'
  )
}

export async function getAbnahmeprotokollMailDefaults(auftragId: string): Promise<
  | {
      ok: true
      defaultAnrede: MailAnrede
      defaultBetreff: string
      defaultNachricht: string
      kundeName: string
    }
  | { ok: false; message: string }
> {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunden(name, typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  const kunde = auf.kunden as { name?: string; typ?: string | null } | null
  const kundeName = kunde?.name?.trim() || 'Kundin/Kunde'
  const defaultAnrede: MailAnrede = istPrivatKundeTyp(kunde?.typ) ? 'du' : 'sie'
  return {
    ok: true,
    defaultAnrede,
    defaultBetreff: `Abnahmeprotokoll — ${kundeName}`,
    defaultNachricht: defaultAbnahmeprotokollNachricht(defaultAnrede),
    kundeName,
  }
}

export async function previewAbnahmeprotokollMail(input: {
  auftragId: string
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const built = await buildAbnahmeMail(input)
  if (!built.ok) return built
  return { ok: true, html: built.html }
}

async function buildAbnahmeMail(input: {
  auftragId: string
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}) {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunden(name, email)')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (!auf) return { ok: false as const, message: 'Auftrag nicht gefunden' }
  const kunde = auf.kunden as { name?: string; email?: string } | null
  if (!kunde?.email?.trim()) return { ok: false as const, message: 'Keine Kunden-E-Mail' }

  const vorname = (kunde.name ?? 'Guten Tag').trim().split(/\s+/)[0] || 'Guten Tag'
  const anredeLine =
    input.anrede === 'du' ? `Hallo ${vorname},` : `Guten Tag ${kunde.name?.trim() || vorname},`
  const textHtml = escapeHtml(input.nachricht.trim()).replace(/\n/g, '<br/>')
  const branding = await getMailBranding(supabaseAdmin)
  const anhangHinweis = mailText(
    input.anrede,
    'Das Abnahmeprotokoll findest du im PDF-Anhang.',
    'Das Abnahmeprotokoll finden Sie im PDF-Anhang.'
  )
  const html = mailHtmlBase(
    `${anredeLine}<br/><br/>${textHtml}<p style="font-size:13px;color:#6B7280;margin:16px 0 0;">${anhangHinweis}</p>`,
    input.betreff.trim(),
    branding,
    undefined,
    { anrede: input.anrede }
  )
  return {
    ok: true as const,
    html,
    betreff: input.betreff.trim(),
    kundeEmail: kunde.email.trim(),
    kundeName: kunde.name?.trim() || vorname,
  }
}

export async function saveAndSendAbnahmeprotokoll(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const mailBuilt = await buildAbnahmeMail({
    auftragId: input.auftragId,
    betreff: input.betreff,
    nachricht: input.nachricht,
    anrede: input.anrede,
  })
  if (!mailBuilt.ok) return mailBuilt

  const prepared = prepareAbnahmePayload(input)
  const built = await buildPdfBuffer({
    auftragId: input.auftragId,
    abnahmeDatum: input.abnahmeDatum,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    notizen: input.notizen,
  })
  if (!built.ok) return built

  const stored = await persistPdf(input.auftragId, built.buffer)
  if (!stored.ok) return stored

  const hatMaengel = countOffeneMaengel(prepared.maengel) > 0

  const existing = await loadAbnahmeprotokollSummary(input.auftragId)
  const prevOffene = existing ? countOffeneMaengel(existing.maengel) : 0
  const row = {
    abnahme_datum: input.abnahmeDatum.slice(0, 10),
    notizen: input.notizen?.trim() || null,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    pdf_url: stored.publicUrl,
    an_kunde_gesendet_at: new Date().toISOString(),
  }

  let protokollId = existing?.id ?? ''

  if (existing) {
    const { error: upErr } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .update(row)
      .eq('id', existing.id)
    if (upErr) return { ok: false, message: upErr.message }
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .insert({
        auftrag_id: input.auftragId,
        ...row,
        protokoll_typ: 'erstabnahme',
      })
      .select('id')
      .single()
    if (insErr) {
      if (insErr.code === 'PGRST205' || insErr.code === '42P01') {
        return { ok: false, message: 'Tabelle auftrag_abnahmeprotokolle fehlt — Migration ausführen.' }
      }
      return { ok: false, message: insErr.message }
    }
    protokollId = (inserted as { id: string }).id
  }

  if (protokollId) {
    await afterAbnahmePersist({
      auftragId: input.auftragId,
      protokollId,
      punkte: prepared.punkte,
      maengel: prepared.maengel,
      prevOffeneMaengel: prevOffene,
    })
  }

  await supabaseAdmin
    .from('auftraege')
    .update({
      abnahme_protokoll_url: stored.publicUrl,
      abnahme_datum: input.abnahmeDatum.slice(0, 10),
      updated_at: new Date().toISOString(),
      ...(!hatMaengel ? { status: 'abnahme', fortschritt: 85 } : {}),
    })
    .eq('id', input.auftragId)

  const mail = await sendMail({
    typ: 'abnahmeprotokoll',
    an: mailBuilt.kundeEmail,
    anName: mailBuilt.kundeName,
    betreff: mailBuilt.betreff,
    html: mailBuilt.html,
    pdfBuffer: built.buffer,
    pdfName: `Abnahmeprotokoll-${formatAuftragsNr(built.detail)}.pdf`,
    kundeId: built.detail.kunde_id ?? null,
    leadId: built.detail.lead_id ?? null,
    auftragId: input.auftragId,
    kontextTyp: 'auftrag',
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'E-Mail fehlgeschlagen' }

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'abnahmeprotokoll_erstellt',
    titel: 'Abnahmeprotokoll erstellt',
    beschreibung: hatMaengel
      ? 'Abnahmeprotokoll mit Mängeln an den Kunden gesendet.'
      : 'Abnahmeprotokoll ohne Mängel an den Kunden gesendet.',
    erstellt_von: uid,
    sichtbar_fuer_kunde: true,
    fuer_kunde_freigegeben: true,
    freigegeben_at: new Date().toISOString(),
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function saveAbnahmeprotokollPdfOnly(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
}): Promise<
  | { ok: true; pdfBase64: string; filename: string; publicUrl: string }
  | { ok: false; message: string }
> {
  const prepared = prepareAbnahmePayload(input)
  const built = await buildPdfBuffer({ ...input, ...prepared })
  if (!built.ok) return built

  const stored = await persistPdf(input.auftragId, built.buffer)
  if (!stored.ok) return stored

  const row = {
    abnahme_datum: input.abnahmeDatum.slice(0, 10),
    notizen: input.notizen?.trim() || null,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    pdf_url: stored.publicUrl,
    protokoll_typ: 'erstabnahme',
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .insert({
      auftrag_id: input.auftragId,
      ...row,
    })
    .select('id')
    .single()

  if (insErr) {
    if (insErr.code === 'PGRST205' || insErr.code === '42P01') {
      return { ok: false, message: 'Tabelle auftrag_abnahmeprotokolle fehlt — Migration ausführen.' }
    }
    return { ok: false, message: insErr.message }
  }

  const protokollId = (inserted as { id: string }).id
  const hatMaengel = countOffeneMaengel(prepared.maengel) > 0

  await supabaseAdmin
    .from('auftraege')
    .update({
      abnahme_protokoll_url: stored.publicUrl,
      abnahme_datum: input.abnahmeDatum.slice(0, 10),
      updated_at: new Date().toISOString(),
      ...(!hatMaengel ? { status: 'abnahme', fortschritt: 85 } : {}),
    })
    .eq('id', input.auftragId)

  await afterAbnahmePersist({
    auftragId: input.auftragId,
    protokollId,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    prevOffeneMaengel: 0,
  })

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'abnahmeprotokoll_erstellt',
    titel: 'Abnahmeprotokoll erstellt',
    beschreibung: hatMaengel
      ? `Abnahmeprotokoll erstellt — ${countOffeneMaengel(prepared.maengel)} Mängel in der Checkliste.`
      : 'Abnahmeprotokoll als PDF erstellt.',
    erstellt_von: uid,
    sichtbar_fuer_kunde: false,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)

  return {
    ok: true,
    pdfBase64: built.buffer.toString('base64'),
    filename: `Abnahmeprotokoll-${formatAuftragsNr(built.detail)}.pdf`,
    publicUrl: stored.publicUrl,
  }
}

async function syncAuftragAbnahmeDenorm(auftragId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select('abnahme_datum, pdf_url')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabaseAdmin
    .from('auftraege')
    .update({
      abnahme_protokoll_url: (data?.pdf_url as string | null) ?? null,
      abnahme_datum: (data?.abnahme_datum as string | null) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)
}

export type AbnahmeprotokollListeEintrag = {
  id: string
  abnahme_datum: string
  notizen: string | null
  pdf_url: string | null
  created_at: string
  an_kunde_gesendet_at: string | null
}

export async function loadAbnahmeprotokolleListe(
  auftragId: string
): Promise<AbnahmeprotokollListeEintrag[]> {
  const { data, error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select('id, abnahme_datum, notizen, pdf_url, created_at, an_kunde_gesendet_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error || !data?.length) return []
  return data.map((row) => ({
    id: row.id as string,
    abnahme_datum: row.abnahme_datum as string,
    notizen: (row.notizen as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    created_at: row.created_at as string,
    an_kunde_gesendet_at: (row.an_kunde_gesendet_at as string | null) ?? null,
  }))
}

export async function deleteAbnahmeprotokoll(
  protokollId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .delete()
    .eq('id', protokollId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }

  await syncAuftragAbnahmeDenorm(auftragId)
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function loadLetztesAbnahmeprotokoll(auftragId: string): Promise<{
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
} | null> {
  const summary = await loadAbnahmeprotokollSummary(auftragId)
  if (!summary) return null
  return { punkte: summary.punkte, maengel: summary.maengel }
}

export async function loadAbnahmeprotokollSummary(auftragId: string): Promise<{
  id: string
  abnahme_datum: string
  notizen: string | null
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  pdf_url: string | null
  an_kunde_gesendet_at: string | null
  statistik: ReturnType<typeof abnahmePunkteStatistik>
} | null> {
  const { data, error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select('id, abnahme_datum, notizen, punkte, maengel, pdf_url, an_kunde_gesendet_at')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const punkte = (data.punkte ?? []) as AbnahmePunkt[]
  const maengel = normalizeMaengel((data.maengel ?? []) as AbnahmeMangel[])
  return {
    id: data.id as string,
    abnahme_datum: data.abnahme_datum as string,
    notizen: (data.notizen as string | null) ?? null,
    punkte: applyPunktStatusFromMaengel(punkte, maengel),
    maengel,
    pdf_url: (data.pdf_url as string | null) ?? null,
    an_kunde_gesendet_at: (data.an_kunde_gesendet_at as string | null) ?? null,
    statistik: abnahmePunkteStatistik(punkte),
  }
}

/** Zwischenspeichern (digital vor Ort) — optional PDF neu erzeugen. */
export async function saveAbnahmeprotokollDraft(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
  regeneratePdf?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await loadAbnahmeprotokollSummary(input.auftragId)
  const prevOffene = existing ? countOffeneMaengel(existing.maengel) : 0
  const prepared = prepareAbnahmePayload({
    punkte: input.punkte,
    maengel:
      input.maengel.length > 0
        ? input.maengel
        : mergeMaengelFromPunkte(input.punkte, existing?.maengel ?? []),
  })
  const hatMaengel = countOffeneMaengel(prepared.maengel) > 0
  let protokollId = existing?.id ?? ''

  if (existing) {
    const { error } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .update({
        abnahme_datum: input.abnahmeDatum.slice(0, 10),
        notizen: input.notizen?.trim() || null,
        punkte: prepared.punkte,
        maengel: prepared.maengel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { ok: false, message: error.message }
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .insert({
        auftrag_id: input.auftragId,
        abnahme_datum: input.abnahmeDatum.slice(0, 10),
        notizen: input.notizen?.trim() || null,
        punkte: prepared.punkte,
        maengel: prepared.maengel,
        pdf_url: null,
        protokoll_typ: 'erstabnahme',
      })
      .select('id')
      .single()
    if (insErr) {
      if (insErr.code === 'PGRST205' || insErr.code === '42P01') {
        return { ok: false, message: 'Tabelle auftrag_abnahmeprotokolle fehlt — Migration ausführen.' }
      }
      return { ok: false, message: insErr.message }
    }
    protokollId = (inserted as { id: string }).id
  }

  await supabaseAdmin
    .from('auftraege')
    .update({
      abnahme_datum: input.abnahmeDatum.slice(0, 10),
      updated_at: new Date().toISOString(),
      ...(!hatMaengel ? { status: 'abnahme', fortschritt: 85 } : {}),
    })
    .eq('id', input.auftragId)

  if (protokollId) {
    await afterAbnahmePersist({
      auftragId: input.auftragId,
      protokollId,
      punkte: prepared.punkte,
      maengel: prepared.maengel,
      prevOffeneMaengel: prevOffene,
    })
  }

  if (input.regeneratePdf && protokollId) {
    const pdf = await persistProtokollPdfForRow(input.auftragId, protokollId, {
      abnahmeDatum: input.abnahmeDatum,
      punkte: prepared.punkte,
      maengel: prepared.maengel,
      notizen: input.notizen,
      protokollTyp: hatMaengel ? 'nachabnahme' : 'erstabnahme',
    })
    if (!pdf.ok) return pdf
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function updateAbnahmeMaengel(input: {
  auftragId: string
  punktId: string
  status: AbnahmeMangelStatus
  beschreibung?: string
  frist?: string | null
  foto_nachher_urls?: string[]
  notiz?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const summary = await loadAbnahmeprotokollSummary(input.auftragId)
  if (!summary) return { ok: false, message: 'Kein Abnahmeprotokoll vorhanden.' }

  const uid = await getAuthUserId()
  const now = new Date().toISOString()
  const idx = summary.maengel.findIndex((m) => m.punkt_id === input.punktId)
  if (idx < 0) return { ok: false, message: 'Mangel nicht gefunden.' }

  let m = normalizeMaengel([summary.maengel[idx]!])[0]!
  if (input.beschreibung !== undefined) m = { ...m, beschreibung: input.beschreibung.trim() }
  if (input.frist !== undefined) m = { ...m, frist: input.frist }
  if (input.foto_nachher_urls !== undefined) m = { ...m, foto_nachher_urls: input.foto_nachher_urls }

  const prevStatus = m.status ?? 'offen'
  m = { ...m, status: input.status }

  if (input.status === 'in_bearbeitung' && prevStatus === 'offen') {
    m = appendMangelVerlauf(m, 'in_bearbeitung', input.notiz)
  }
  if (input.status === 'behoben') {
    m = {
      ...appendMangelVerlauf(m, 'behoben', input.notiz, now),
      behoben_at: now,
      behoben_von: uid,
    }
  }
  if (input.status === 'abgenommen') {
    m = {
      ...appendMangelVerlauf(m, 'abgenommen', input.notiz, now),
      abgenommen_at: now,
      behoben_at: m.behoben_at ?? now,
      behoben_von: m.behoben_von ?? uid,
    }
  }

  const maengel = [...summary.maengel]
  maengel[idx] = m
  const punkte = applyPunktStatusFromMaengel(summary.punkte, maengel)

  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({
      punkte,
      maengel: normalizeMaengel(maengel),
      updated_at: now,
    })
    .eq('id', summary.id)

  if (error) return { ok: false, message: error.message }

  await afterAbnahmePersist({
    auftragId: input.auftragId,
    protokollId: summary.id,
    punkte,
    maengel: normalizeMaengel(maengel),
    prevOffeneMaengel: countOffeneMaengel(summary.maengel),
  })

  if (input.status === 'behoben' || input.status === 'abgenommen') {
    await insertAuftragTimelineEvent({
      auftrag_id: input.auftragId,
      typ: 'mangel_behoben',
      titel: input.status === 'abgenommen' ? 'Mangel abgenommen' : 'Mangel behoben',
      beschreibung: m.beschreibung,
      erstellt_von: uid,
      foto_urls: m.foto_nachher_urls ?? [],
      sichtbar_fuer_kunde: input.status === 'abgenommen',
      fuer_kunde_freigegeben: input.status === 'abgenommen',
      freigegeben_at: input.status === 'abgenommen' ? now : null,
    })
  }

  const pdf = await persistProtokollPdfForRow(input.auftragId, summary.id, {
    abnahmeDatum: summary.abnahme_datum,
    punkte,
    maengel: normalizeMaengel(maengel),
    notizen: summary.notizen,
    protokollTyp: countOffeneMaengel(maengel) === 0 ? 'schlussabnahme' : 'nachabnahme',
  })
  if (!pdf.ok) return pdf

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function regenerateAbnahmeprotokollPdf(
  auftragId: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const summary = await loadAbnahmeprotokollSummary(auftragId)
  if (!summary) return { ok: false, message: 'Kein Abnahmeprotokoll vorhanden.' }

  const prepared = prepareAbnahmePayload({
    punkte: summary.punkte,
    maengel: summary.maengel,
  })

  const pdf = await persistProtokollPdfForRow(auftragId, summary.id, {
    abnahmeDatum: summary.abnahme_datum,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    notizen: summary.notizen,
    protokollTyp: countOffeneMaengel(prepared.maengel) === 0 ? 'schlussabnahme' : 'nachabnahme',
  })
  if (!pdf.ok) return pdf

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, publicUrl: pdf.publicUrl }
}

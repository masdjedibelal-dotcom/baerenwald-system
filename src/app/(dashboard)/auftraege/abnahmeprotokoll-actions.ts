'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  normalizeAbnahmeProtokollMeta,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import { resolveAbnahmeProtokollMetaForSave } from '@/lib/auftraege/abnahme-protokoll-html-payload'
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
import {
  kannGesamtabnahmeErzeugen,
  normalizeAbnahmeEbene,
  normalizeAbnahmeFreigabeStatus,
  type AbnahmeFreigabeStatus,
  type AbnahmeHwFreigabeZeile,
  type AbnahmeProtokollEbene,
} from '@/lib/auftraege/abnahme-freigabe'
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
    meta?: AbnahmeProtokollMeta | null
    protokollTyp?: string
  }
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const meta = input.meta ? normalizeAbnahmeProtokollMeta(input.meta) : undefined
  const built = await buildPdfBuffer({
    auftragId,
    abnahmeDatum: input.abnahmeDatum,
    punkte: input.punkte,
    maengel: input.maengel,
    notizen: input.notizen,
    meta,
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
      ...(meta ? { meta } : {}),
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
  meta?: AbnahmeProtokollMeta | null
}) {
  const detail = await loadAuftragDetail(input.auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Auftrag/Kunde nicht gefunden' }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const buffer = await renderAbnahmeProtokollPdfBuffer(detail, firm, {
    abnahmeDatum: input.abnahmeDatum,
    punkte: input.punkte,
    maengel: input.maengel,
    notizen: input.notizen,
    meta: input.meta ?? null,
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
  meta?: AbnahmeProtokollMeta | null
}): Promise<
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; message: string }
> {
  const built = await buildPdfBuffer({
    ...input,
    meta: input.meta ? normalizeAbnahmeProtokollMeta(input.meta) : null,
  })
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
  protokollId?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const existingGate = await loadAbnahmeprotokollSummary(
    input.auftragId,
    input.protokollId
  )
  if (
    existingGate &&
    existingGate.freigabe_status !== 'freigegeben' &&
    existingGate.ebene === 'handwerker'
  ) {
    return {
      ok: false,
      message: 'Teilabnahme zuerst im CRM freigeben — danach Versand möglich.',
    }
  }

  const mailBuilt = await buildAbnahmeMail({
    auftragId: input.auftragId,
    betreff: input.betreff,
    nachricht: input.nachricht,
    anrede: input.anrede,
  })
  if (!mailBuilt.ok) return mailBuilt

  const prepared = prepareAbnahmePayload(input)
  const existing = existingGate ?? (await loadAbnahmeprotokollSummary(input.auftragId))
  const built = await buildPdfBuffer({
    auftragId: input.auftragId,
    abnahmeDatum: input.abnahmeDatum,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    notizen: input.notizen,
    meta: existing?.meta ?? null,
  })
  if (!built.ok) return built

  const stored = await persistPdf(input.auftragId, built.buffer)
  if (!stored.ok) return stored

  const hatMaengel = countOffeneMaengel(prepared.maengel) > 0

  const prevOffene = existing ? countOffeneMaengel(existing.maengel) : 0
  const row = {
    abnahme_datum: input.abnahmeDatum.slice(0, 10),
    notizen: input.notizen?.trim() || null,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    ...(existing?.meta ? { meta: existing.meta } : {}),
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
    email_log_id: mail.emailLogId ?? null,
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
  meta?: AbnahmeProtokollMeta | null
  /** Bestehendes Protokoll gezielt aktualisieren (sonst: letztes oder neu). */
  protokollId?: string | null
  /** Teilabnahme eines Partners (Portal) */
  handwerkerId?: string | null
  ebene?: AbnahmeProtokollEbene
  freigabeStatus?: AbnahmeFreigabeStatus
  /** Kein Status-Bump auf Auftrag (z. B. Portal → zur_freigabe) */
  skipAuftragStatusBump?: boolean
}): Promise<
  | {
      ok: true
      pdfBase64: string
      filename: string
      publicUrl: string
      updated: boolean
      protokollId: string
    }
  | { ok: false; message: string }
> {
  const existing = await loadAbnahmeprotokollSummary(
    input.auftragId,
    input.protokollId
  )
  const prepared = prepareAbnahmePayload({
    punkte: input.punkte,
    maengel:
      input.maengel.length > 0
        ? input.maengel
        : mergeMaengelFromPunkte(input.punkte, existing?.maengel ?? []),
  })

  const detail = await loadAuftragDetail(input.auftragId)
  if (!detail?.kunden) return { ok: false, message: 'Auftrag/Kunde nicht gefunden' }
  const firm = await fetchFirmenEinstellungen(supabaseAdmin)

  // Stammdaten + KI-Freitexte (Leistungsumfang / Hinweis) vor PDF
  const meta = await resolveAbnahmeProtokollMetaForSave(detail, firm, {
    meta: input.meta ?? null,
    previousMeta: existing?.meta ?? null,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    notizen: input.notizen,
    abnahmeDatum: input.abnahmeDatum,
  })

  const built = await buildPdfBuffer({
    auftragId: input.auftragId,
    abnahmeDatum: input.abnahmeDatum,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    notizen: input.notizen,
    meta,
  })
  if (!built.ok) return built

  const stored = await persistPdf(input.auftragId, built.buffer)
  if (!stored.ok) return stored

  const hatMaengel = countOffeneMaengel(prepared.maengel) > 0
  const ebene: AbnahmeProtokollEbene =
    input.ebene ?? (input.handwerkerId?.trim() ? 'handwerker' : 'gesamt')
  const freigabeStatus: AbnahmeFreigabeStatus =
    input.freigabeStatus ?? existing?.freigabe_status ?? 'entwurf'
  const protokollTyp: 'erstabnahme' | 'nachabnahme' = hatMaengel
    ? 'nachabnahme'
    : existing?.an_kunde_gesendet_at
      ? 'nachabnahme'
      : 'erstabnahme'
  const rowPatch = {
    abnahme_datum: input.abnahmeDatum.slice(0, 10),
    notizen: input.notizen?.trim() || null,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    meta,
    pdf_url: stored.publicUrl,
    protokoll_typ: protokollTyp,
    updated_at: new Date().toISOString(),
    ebene,
    freigabe_status: freigabeStatus,
    ...(input.handwerkerId?.trim()
      ? { handwerker_id: input.handwerkerId.trim() }
      : ebene === 'gesamt'
        ? { handwerker_id: null }
        : {}),
  }

  let protokollId = existing?.id ?? ''
  if (existing) {
    const { error } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .update(rowPatch)
      .eq('id', existing.id)
    if (error) return { ok: false, message: error.message }
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .insert({
        auftrag_id: input.auftragId,
        ...rowPatch,
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

  if (!input.skipAuftragStatusBump) {
    await supabaseAdmin
      .from('auftraege')
      .update({
        abnahme_protokoll_url: stored.publicUrl,
        abnahme_datum: input.abnahmeDatum.slice(0, 10),
        updated_at: new Date().toISOString(),
        ...(!hatMaengel && ebene === 'gesamt' ? { status: 'abnahme', fortschritt: 85 } : {}),
      })
      .eq('id', input.auftragId)
  } else {
    await supabaseAdmin
      .from('auftraege')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.auftragId)
  }

  await afterAbnahmePersist({
    auftragId: input.auftragId,
    protokollId,
    punkte: prepared.punkte,
    maengel: prepared.maengel,
    prevOffeneMaengel: existing ? countOffeneMaengel(existing.maengel) : 0,
  })

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'abnahmeprotokoll_erstellt',
    titel: existing ? 'Abnahmeprotokoll aktualisiert' : 'Abnahmeprotokoll erstellt',
    beschreibung: existing
      ? hatMaengel
        ? `Abnahmeprotokoll korrigiert — ${countOffeneMaengel(prepared.maengel)} offene Mängel.`
        : 'Abnahmeprotokoll korrigiert und PDF neu erzeugt.'
      : hatMaengel
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
    updated: Boolean(existing),
    protokollId,
  }
}

/**
 * Phase 8: Abnahme speichern und Auftrag abschließen (ein Canvas-Weg).
 * Mit zugewiesenen Partnern: erst alle HW-Teilabnahmen freigegeben → Gesamtabnahme.
 * Optional: PDF per E-Mail an den Kunden (ohne Status zurück auf „abnahme“ zu setzen).
 */
export async function saveAbnahmeAndAbschliessen(input: {
  auftragId: string
  abnahmeDatum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen: string | null
  meta?: AbnahmeProtokollMeta | null
  protokollId?: string | null
  sendToKunde?: boolean
}): Promise<
  | {
      ok: true
      pdfBase64: string
      filename: string
      publicUrl: string
      updated: boolean
      previousStatus: string
      protokollId: string
      sentToKunde: boolean
      sendWarning?: string
    }
  | { ok: false; message: string }
> {
  const detail = await loadAuftragDetail(input.auftragId)
  if (!detail) return { ok: false, message: 'Auftrag nicht gefunden' }
  const previousStatus = String(detail.status ?? 'in_arbeit')
  if (previousStatus === 'abgeschlossen') {
    return { ok: false, message: 'Auftrag ist bereits abgeschlossen.' }
  }

  const hwGate = await loadAbnahmeHwFreigabeZeilen(input.auftragId)
  const gesamtGate = kannGesamtabnahmeErzeugen(hwGate)
  if (!gesamtGate.ok) {
    return { ok: false, message: gesamtGate.message ?? 'Gesamtabnahme noch nicht möglich.' }
  }

  const saved = await saveAbnahmeprotokollPdfOnly({
    ...input,
    ebene: 'gesamt',
    freigabeStatus: 'freigegeben',
  })
  if (!saved.ok) return saved

  const uid = await getAuthUserId()
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({
      freigabe_status: 'freigegeben',
      freigegeben_at: now,
      freigegeben_von: uid,
      ebene: 'gesamt',
    })
    .eq('id', saved.protokollId)

  const { finalizeAbschlussdokumentationOhneMail } = await import(
    '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
  )
  const closed = await finalizeAbschlussdokumentationOhneMail(input.auftragId)
  if (!closed.ok) return closed

  let sentToKunde = false
  let sendWarning: string | undefined
  if (input.sendToKunde) {
    const mailDefaults = await getAbnahmeprotokollMailDefaults(input.auftragId)
    if (!mailDefaults.ok) {
      sendWarning = mailDefaults.message
    } else {
      const mailBuilt = await buildAbnahmeMail({
        auftragId: input.auftragId,
        betreff: mailDefaults.defaultBetreff,
        nachricht: mailDefaults.defaultNachricht,
        anrede: mailDefaults.defaultAnrede,
      })
      if (!mailBuilt.ok) {
        sendWarning = mailBuilt.message
      } else {
        const hatMaengel = countOffeneMaengel(prepareAbnahmePayload(input).maengel) > 0
        const mail = await sendMail({
          typ: 'abnahmeprotokoll',
          an: mailBuilt.kundeEmail,
          anName: mailBuilt.kundeName,
          betreff: mailBuilt.betreff,
          html: mailBuilt.html,
          pdfBuffer: Buffer.from(saved.pdfBase64, 'base64'),
          pdfName: `Abnahmeprotokoll-${formatAuftragsNr(detail)}.pdf`,
          kundeId: detail.kunde_id ?? null,
          leadId: detail.lead_id ?? null,
          auftragId: input.auftragId,
          kontextTyp: 'auftrag',
        })
        if (!mail.success) {
          sendWarning = mail.error ?? 'E-Mail fehlgeschlagen'
        } else {
          await supabaseAdmin
            .from('auftrag_abnahmeprotokolle')
            .update({ an_kunde_gesendet_at: new Date().toISOString() })
            .eq('id', saved.protokollId)

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
            email_log_id: mail.emailLogId ?? null,
          })
          sentToKunde = true
        }
      }
    }
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  revalidatePath('/auftraege')
  revalidatePath('/vorgaenge')

  return { ...saved, previousStatus, sentToKunde, sendWarning }
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
  handwerker_id: string | null
  handwerker_name: string | null
  ebene: AbnahmeProtokollEbene
  freigabe_status: AbnahmeFreigabeStatus
}

export async function loadAbnahmeprotokolleListe(
  auftragId: string
): Promise<AbnahmeprotokollListeEintrag[]> {
  const { data, error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select(
      'id, abnahme_datum, notizen, pdf_url, created_at, an_kunde_gesendet_at, handwerker_id, ebene, freigabe_status, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error || !data?.length) {
    // Fallback ohne neue Spalten
    const { data: legacy } = await supabaseAdmin
      .from('auftrag_abnahmeprotokolle')
      .select('id, abnahme_datum, notizen, pdf_url, created_at, an_kunde_gesendet_at')
      .eq('auftrag_id', auftragId)
      .order('created_at', { ascending: false })
    if (!legacy?.length) return []
    return legacy.map((row) => ({
      id: row.id as string,
      abnahme_datum: row.abnahme_datum as string,
      notizen: (row.notizen as string | null) ?? null,
      pdf_url: (row.pdf_url as string | null) ?? null,
      created_at: row.created_at as string,
      an_kunde_gesendet_at: (row.an_kunde_gesendet_at as string | null) ?? null,
      handwerker_id: null,
      handwerker_name: null,
      ebene: 'gesamt' as const,
      freigabe_status: (row.an_kunde_gesendet_at || row.pdf_url
        ? 'freigegeben'
        : 'entwurf') as AbnahmeFreigabeStatus,
    }))
  }

  return data.map((row) => {
    const hw = row.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const hwOne = Array.isArray(hw) ? hw[0] : hw
    return {
      id: row.id as string,
      abnahme_datum: row.abnahme_datum as string,
      notizen: (row.notizen as string | null) ?? null,
      pdf_url: (row.pdf_url as string | null) ?? null,
      created_at: row.created_at as string,
      an_kunde_gesendet_at: (row.an_kunde_gesendet_at as string | null) ?? null,
      handwerker_id: (row.handwerker_id as string | null) ?? null,
      handwerker_name: hwOne?.name?.trim() || null,
      ebene: normalizeAbnahmeEbene(row.ebene),
      freigabe_status: normalizeAbnahmeFreigabeStatus(row.freigabe_status),
    }
  })
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

export async function loadAbnahmeprotokollSummary(
  auftragId: string,
  protokollId?: string | null
): Promise<{
  id: string
  abnahme_datum: string
  notizen: string | null
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  meta: AbnahmeProtokollMeta
  pdf_url: string | null
  an_kunde_gesendet_at: string | null
  handwerker_id: string | null
  ebene: AbnahmeProtokollEbene
  freigabe_status: AbnahmeFreigabeStatus
  statistik: ReturnType<typeof abnahmePunkteStatistik>
} | null> {
  const id = protokollId?.trim() || null
  const selectCols =
    'id, abnahme_datum, notizen, punkte, maengel, meta, pdf_url, an_kunde_gesendet_at, handwerker_id, ebene, freigabe_status'
  const { data, error } = id
    ? await supabaseAdmin
        .from('auftrag_abnahmeprotokolle')
        .select(selectCols)
        .eq('auftrag_id', auftragId)
        .eq('id', id)
        .maybeSingle()
    : await supabaseAdmin
        .from('auftrag_abnahmeprotokolle')
        .select(selectCols)
        .eq('auftrag_id', auftragId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

  if (error || !data) {
    // Fallback ohne meta-Spalte (Migration noch nicht applied)
    if (error && (error.message?.includes('meta') || error.code === '42703')) {
      const { data: legacy } = id
        ? await supabaseAdmin
            .from('auftrag_abnahmeprotokolle')
            .select('id, abnahme_datum, notizen, punkte, maengel, pdf_url, an_kunde_gesendet_at')
            .eq('auftrag_id', auftragId)
            .eq('id', id)
            .maybeSingle()
        : await supabaseAdmin
            .from('auftrag_abnahmeprotokolle')
            .select('id, abnahme_datum, notizen, punkte, maengel, pdf_url, an_kunde_gesendet_at')
            .eq('auftrag_id', auftragId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
      if (!legacy) return null
      const punkteL = (legacy.punkte ?? []) as AbnahmePunkt[]
      const maengelL = normalizeMaengel((legacy.maengel ?? []) as AbnahmeMangel[])
      return {
        id: legacy.id as string,
        abnahme_datum: legacy.abnahme_datum as string,
        notizen: (legacy.notizen as string | null) ?? null,
        punkte: applyPunktStatusFromMaengel(punkteL, maengelL),
        maengel: maengelL,
        meta: normalizeAbnahmeProtokollMeta({}),
        pdf_url: (legacy.pdf_url as string | null) ?? null,
        an_kunde_gesendet_at: (legacy.an_kunde_gesendet_at as string | null) ?? null,
        handwerker_id: null,
        ebene: 'gesamt',
        freigabe_status: (legacy.an_kunde_gesendet_at || legacy.pdf_url
          ? 'freigegeben'
          : 'entwurf') as AbnahmeFreigabeStatus,
        statistik: abnahmePunkteStatistik(punkteL),
      }
    }
    return null
  }
  const punkte = (data.punkte ?? []) as AbnahmePunkt[]
  const maengel = normalizeMaengel((data.maengel ?? []) as AbnahmeMangel[])
  return {
    id: data.id as string,
    abnahme_datum: data.abnahme_datum as string,
    notizen: (data.notizen as string | null) ?? null,
    punkte: applyPunktStatusFromMaengel(punkte, maengel),
    maengel,
    meta: normalizeAbnahmeProtokollMeta((data as { meta?: unknown }).meta),
    pdf_url: (data.pdf_url as string | null) ?? null,
    an_kunde_gesendet_at: (data.an_kunde_gesendet_at as string | null) ?? null,
    handwerker_id: (data.handwerker_id as string | null) ?? null,
    ebene: normalizeAbnahmeEbene(data.ebene),
    freigabe_status: normalizeAbnahmeFreigabeStatus(data.freigabe_status),
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
  meta?: AbnahmeProtokollMeta | null
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
  const meta = input.meta
    ? normalizeAbnahmeProtokollMeta(input.meta)
    : existing?.meta
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
        ...(meta ? { meta } : {}),
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
        ...(meta ? { meta } : {}),
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
      meta: meta ?? null,
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

/** Zugewiesene Partner + aktueller Freigabe-Stand ihrer Teilabnahme. */
export async function loadAbnahmeHwFreigabeZeilen(
  auftragId: string
): Promise<AbnahmeHwFreigabeZeile[]> {
  const { data: zuweisungen } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select(
      'handwerker_id, abnahme_signiert_am, abnahme_protokoll_id, handwerker:handwerker_id(id, name)'
    )
    .eq('auftrag_id', auftragId)

  if (!zuweisungen?.length) return []

  type ProtRow = {
    id: string
    handwerker_id: string | null
    freigabe_status: string | null
    abnahme_datum: string | null
    pdf_url: string | null
    maengel: unknown
    created_at: string
  }
  const { data: protokolle } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select(
      'id, handwerker_id, freigabe_status, abnahme_datum, pdf_url, maengel, created_at'
    )
    .eq('auftrag_id', auftragId)
    .eq('ebene', 'handwerker')
    .order('created_at', { ascending: false })

  const protRows = (protokolle ?? []) as ProtRow[]
  const latestByHw = new Map<string, ProtRow>()
  for (const p of protRows) {
    const hid = (p.handwerker_id ?? '').trim()
    if (!hid || latestByHw.has(hid)) continue
    latestByHw.set(hid, p)
  }

  return zuweisungen.map((z) => {
    const hid = String(z.handwerker_id ?? '').trim()
    const hw = z.handwerker as { id?: string; name?: string | null } | { id?: string; name?: string | null }[] | null
    const hwOne = Array.isArray(hw) ? hw[0] : hw
    const prot =
      (z.abnahme_protokoll_id
        ? protRows.find((p) => p.id === z.abnahme_protokoll_id)
        : null) ??
      latestByHw.get(hid) ??
      null
    const maengel = normalizeMaengel((prot?.maengel ?? []) as AbnahmeMangel[])
    return {
      handwerkerId: hid,
      handwerkerName: hwOne?.name?.trim() || 'Partner',
      abnahmeSigniertAm: (z.abnahme_signiert_am as string | null) ?? null,
      protokollId: prot?.id ?? null,
      freigabeStatus: prot
        ? normalizeAbnahmeFreigabeStatus(prot.freigabe_status)
        : null,
      abnahmeDatum: prot?.abnahme_datum ?? null,
      pdfUrl: prot?.pdf_url ?? null,
      maengelOffen: countOffeneMaengel(maengel),
    }
  })
}

export async function freigebenAbnahmeprotokoll(
  protokollId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await getAuthUserId()
  const now = new Date().toISOString()

  const { data: row, error: loadErr } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select('id, freigabe_status, ebene, handwerker_id')
    .eq('id', protokollId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (loadErr || !row) return { ok: false, message: 'Protokoll nicht gefunden.' }

  const status = normalizeAbnahmeFreigabeStatus(row.freigabe_status)
  if (status === 'freigegeben') return { ok: true }
  if (status !== 'zur_freigabe' && status !== 'abgelehnt' && status !== 'entwurf') {
    return { ok: false, message: 'Protokoll kann nicht freigegeben werden.' }
  }

  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({
      freigabe_status: 'freigegeben',
      freigegeben_at: now,
      freigegeben_von: uid,
      abgelehnt_at: null,
      abgelehnt_von: null,
      ablehnung_notiz: null,
      updated_at: now,
    })
    .eq('id', protokollId)
  if (error) return { ok: false, message: error.message }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz',
    titel:
      normalizeAbnahmeEbene(row.ebene) === 'handwerker'
        ? 'Teilabnahme freigegeben'
        : 'Abnahmeprotokoll freigegeben',
    beschreibung: 'CRM-Freigabe — Versand an Kunde optional danach.',
    erstellt_von: uid,
    sichtbar_fuer_kunde: false,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function ablehnenAbnahmeprotokoll(input: {
  protokollId: string
  auftragId: string
  notiz?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await getAuthUserId()
  const now = new Date().toISOString()
  const notiz = input.notiz?.trim() || null

  const { data: row, error: loadErr } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .select('id, freigabe_status, maengel, punkte')
    .eq('id', input.protokollId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
  if (loadErr || !row) return { ok: false, message: 'Protokoll nicht gefunden.' }

  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({
      freigabe_status: 'abgelehnt',
      abgelehnt_at: now,
      abgelehnt_von: uid,
      ablehnung_notiz: notiz,
      freigegeben_at: null,
      freigegeben_von: null,
      updated_at: now,
    })
    .eq('id', input.protokollId)
  if (error) return { ok: false, message: error.message }

  try {
    await syncPunchListFromAbnahmeMaengel({
      auftragId: input.auftragId,
      protokollId: input.protokollId,
      punkte: (row.punkte ?? []) as AbnahmePunkt[],
      maengel: normalizeMaengel((row.maengel ?? []) as AbnahmeMangel[]),
    })
  } catch (e) {
    console.warn('[ablehnenAbnahmeprotokoll] punch-list', e)
  }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'mangel_neu',
    titel: 'Teilabnahme abgelehnt',
    beschreibung: notiz || 'CRM hat die Teilabnahme abgelehnt — Nacharbeit / Punch-List.',
    erstellt_von: uid,
    sichtbar_fuer_kunde: false,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

/** Ob Gesamtabnahme-Button aktiv sein darf (alle zugewiesenen HW freigegeben). */
export async function getGesamtabnahmeGate(
  auftragId: string
): Promise<{ ok: boolean; message?: string; zeilen: AbnahmeHwFreigabeZeile[] }> {
  const zeilen = await loadAbnahmeHwFreigabeZeilen(auftragId)
  const gate = kannGesamtabnahmeErzeugen(zeilen)
  return { ...gate, zeilen }
}

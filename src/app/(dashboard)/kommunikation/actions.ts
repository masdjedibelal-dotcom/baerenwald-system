'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  buildFreitextKundenMailHtml,
  defaultFreitextMailBody,
} from '@/lib/mail/freitext-kunden-mail'
import { logLeadEmailTimelineEvent } from '@/lib/kommunikation/log-lead-email-timeline'
import {
  applyEmailLogOrFilter,
  emailLogEqFilter,
  emailLogInFilter,
} from '@/lib/kommunikation/email-log-list-filter'
import { sendMail } from '@/lib/mail-service'
import { projektOderStatusLink } from '@/lib/mail/versand-helpers'
import type { MailAnrede } from '@/lib/mail/anrede'
import {
  freitextMailTyp,
  type KommunikationKontextTyp,
  type KommunikationListeZeile,
  type KommunikationMailVorlageKontext,
  type MailComposeContext,
} from '@/lib/kommunikation/types'
import { loadCrmTeamMitglieder } from '@/lib/crm-team'
import { KUNDE_MAIL_BCC } from '@/lib/mail-constants'
import { markLeadKontaktiertWennNeu } from '@/app/(dashboard)/anfragen/actions'

const EMAIL_LOG_SELECT_FULL =
  'id, typ, kontext_typ, richtung, an_email, von_email, cc_email, betreff, created_at, status, gesendet_von'
const EMAIL_LOG_SELECT_LEGACY = 'id, typ, an_email, betreff, created_at, status'

function normalizeEmailLogRow(
  row: Record<string, unknown>,
  teamNames: Map<string, string>
): KommunikationListeZeile {
  const gesendetVon = typeof row.gesendet_von === 'string' ? row.gesendet_von : null
  return {
    id: String(row.id),
    typ: String(row.typ ?? ''),
    kontext_typ: typeof row.kontext_typ === 'string' ? row.kontext_typ : null,
    richtung: typeof row.richtung === 'string' ? row.richtung : 'gesendet',
    an_email: String(row.an_email ?? ''),
    von_email: typeof row.von_email === 'string' ? row.von_email : null,
    cc_email: typeof row.cc_email === 'string' ? row.cc_email : null,
    betreff: String(row.betreff ?? ''),
    created_at: String(row.created_at ?? ''),
    status: String(row.status ?? 'gesendet'),
    gesendet_von: gesendetVon,
    gesendet_von_name: gesendetVon ? teamNames.get(gesendetVon) ?? null : null,
  }
}

// Supabase-Query-Typen unterscheiden sich je nach select()-String — bewusst locker typisiert.
async function runEmailLogListQuery(
  apply: (q: { eq: (col: string, val: string) => unknown; or: (expr: string) => unknown }) => unknown
): Promise<KommunikationListeZeile[]> {
  const base = (select: string) =>
    supabaseAdmin.from('email_log').select(select).order('created_at', { ascending: false }).limit(120)

  let result = (await apply(base(EMAIL_LOG_SELECT_FULL))) as {
    data: Record<string, unknown>[] | null
    error: { message: string } | null
  }
  let { data, error } = result

  if (error && /column|kontext_typ|richtung|von_email|cc_email|gesendet_von/i.test(error.message)) {
    result = (await apply(base(EMAIL_LOG_SELECT_LEGACY))) as typeof result
    ;({ data, error } = result)
  }

  if (error) {
    console.warn('[loadKommunikationListe]', error.message)
    return []
  }

  const team = await loadCrmTeamMitglieder()
  const teamNames = new Map(team.map((m) => [m.id, m.name]))

  return (data ?? []).map((row) => normalizeEmailLogRow(row as Record<string, unknown>, teamNames))
}

export type KommunikationMailVorlage = {
  id: string
  name: string
  kontext_typ: KommunikationMailVorlageKontext
  betreff: string
  body_text: string
  sort_order: number
}

export type KommunikationFilter = {
  kundeId?: string | null
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}

function revalidateKommunikationPaths(f: KommunikationFilter) {
  if (f.kundeId) revalidatePath(`/kunden/${f.kundeId}`)
  if (f.leadId) revalidatePath(`/anfragen/${f.leadId}`)
  if (f.angebotId) revalidatePath(`/angebote/${f.angebotId}`)
  if (f.auftragId) {
    revalidatePath(`/auftraege/${f.auftragId}`)
    revalidatePath(`/auftraege/${f.auftragId}/finanzen`)
  }
  if (f.rechnungId) revalidatePath(`/rechnungen/${f.rechnungId}`)
}

export async function loadKommunikationListe(
  filter: KommunikationFilter
): Promise<KommunikationListeZeile[]> {
  if (filter.rechnungId) {
    const rechnungId = filter.rechnungId
    const { data: rec } = await supabaseAdmin
      .from('rechnungen')
      .select('auftrag_id, kunde_id')
      .eq('id', rechnungId)
      .maybeSingle()
    const parts = [
      emailLogEqFilter('rechnung_id', rechnungId),
      emailLogEqFilter('auftrag_id', rec?.auftrag_id as string | null),
      emailLogEqFilter('kunde_id', rec?.kunde_id as string | null),
    ].filter(Boolean) as string[]
    return runEmailLogListQuery((q) => applyEmailLogOrFilter(q, parts))
  }
  if (filter.angebotId) {
    const angebotId = filter.angebotId
    const { data: ang } = await supabaseAdmin
      .from('angebote')
      .select('lead_id, kunde_id')
      .eq('id', angebotId)
      .maybeSingle()
    const parts = [
      emailLogEqFilter('angebot_id', angebotId),
      emailLogEqFilter('lead_id', ang?.lead_id as string | null),
      emailLogEqFilter('kunde_id', ang?.kunde_id as string | null),
    ].filter(Boolean) as string[]
    return runEmailLogListQuery((q) => applyEmailLogOrFilter(q, parts))
  }
  if (filter.auftragId) {
    const auftragId = filter.auftragId
    const [{ data: auf }, { data: rechnungen }] = await Promise.all([
      supabaseAdmin
        .from('auftraege')
        .select('kunde_id, lead_id, angebot_id')
        .eq('id', auftragId)
        .maybeSingle(),
      supabaseAdmin.from('rechnungen').select('id').eq('auftrag_id', auftragId),
    ])
    const leadId = (auf?.lead_id as string | null) ?? null
    const angebotIds = new Set<string>()
    const angebotId = (auf?.angebot_id as string | null)?.trim()
    if (angebotId) angebotIds.add(angebotId)
    if (leadId) {
      const { data: angeboteLead } = await supabaseAdmin
        .from('angebote')
        .select('id')
        .eq('lead_id', leadId)
      for (const row of angeboteLead ?? []) {
        const id = (row as { id?: string }).id?.trim()
        if (id) angebotIds.add(id)
      }
    }
    const rechnungIds = (rechnungen ?? []).map((r) => r.id as string).filter(Boolean)
    const parts = [
      emailLogEqFilter('auftrag_id', auftragId),
      emailLogEqFilter('kunde_id', auf?.kunde_id as string | null),
      emailLogEqFilter('lead_id', leadId),
      emailLogInFilter('angebot_id', Array.from(angebotIds)),
      emailLogInFilter('rechnung_id', rechnungIds),
    ].filter(Boolean) as string[]
    return runEmailLogListQuery((q) => applyEmailLogOrFilter(q, parts))
  }
  if (filter.leadId) {
    const leadId = filter.leadId
    const [{ data: leadRow }, { data: angebote }, { data: auftraege }] = await Promise.all([
      supabaseAdmin.from('leads').select('kunde_id').eq('id', leadId).maybeSingle(),
      supabaseAdmin.from('angebote').select('id').eq('lead_id', leadId),
      supabaseAdmin.from('auftraege').select('id').eq('lead_id', leadId),
    ])
    const angebotIds = (angebote ?? []).map((a) => a.id as string).filter(Boolean)
    const auftragIds = (auftraege ?? []).map((a) => a.id as string).filter(Boolean)
    const { data: rechnungen } = auftragIds.length
      ? await supabaseAdmin.from('rechnungen').select('id').in('auftrag_id', auftragIds)
      : { data: [] as { id: string }[] }
    const rechnungIds = (rechnungen ?? []).map((r) => r.id as string).filter(Boolean)
    const parts = [
      emailLogEqFilter('lead_id', leadId),
      emailLogEqFilter('kunde_id', leadRow?.kunde_id as string | null),
      emailLogInFilter('angebot_id', angebotIds),
      emailLogInFilter('auftrag_id', auftragIds),
      emailLogInFilter('rechnung_id', rechnungIds),
    ].filter(Boolean) as string[]
    return runEmailLogListQuery((q) => applyEmailLogOrFilter(q, parts))
  }
  if (filter.kundeId) {
    const kundeId = filter.kundeId
    const [{ data: leads }, { data: angebote }, { data: auftraege }, { data: rechnungen }] =
      await Promise.all([
        supabaseAdmin.from('leads').select('id').eq('kunde_id', kundeId),
        supabaseAdmin.from('angebote').select('id').eq('kunde_id', kundeId),
        supabaseAdmin.from('auftraege').select('id').eq('kunde_id', kundeId),
        supabaseAdmin.from('rechnungen').select('id').eq('kunde_id', kundeId),
      ])
    const parts = [
      emailLogEqFilter('kunde_id', kundeId),
      emailLogInFilter('lead_id', (leads ?? []).map((r) => r.id as string)),
      emailLogInFilter('angebot_id', (angebote ?? []).map((r) => r.id as string)),
      emailLogInFilter('auftrag_id', (auftraege ?? []).map((r) => r.id as string)),
      emailLogInFilter('rechnung_id', (rechnungen ?? []).map((r) => r.id as string)),
    ].filter(Boolean) as string[]
    return runEmailLogListQuery((q) => applyEmailLogOrFilter(q, parts))
  }
  return []
}

export async function loadKommunikationMailVorlagen(
  kontextTyp: KommunikationKontextTyp
): Promise<KommunikationMailVorlage[]> {
  const { data, error } = await supabaseAdmin
    .from('kommunikation_mail_vorlagen')
    .select('id, name, kontext_typ, betreff, body_text, sort_order')
    .in('kontext_typ', [kontextTyp, 'alle'])
    .order('sort_order')
    .order('name')

  if (error) {
    console.warn('[loadKommunikationMailVorlagen]', error.message)
    return []
  }
  return (data ?? []) as KommunikationMailVorlage[]
}

export async function saveKommunikationMailVorlage(input: {
  id?: string | null
  name: string
  kontext_typ: KommunikationMailVorlageKontext
  betreff: string
  body_text: string
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const row = {
    name: input.name.trim(),
    kontext_typ: input.kontext_typ,
    betreff: input.betreff.trim(),
    body_text: input.body_text,
    updated_at: new Date().toISOString(),
  }
  if (!row.name) return { ok: false, message: 'Name fehlt' }

  if (input.id) {
    const { error } = await supabaseAdmin
      .from('kommunikation_mail_vorlagen')
      .update(row)
      .eq('id', input.id)
    if (error) return { ok: false, message: error.message }
    revalidatePath('/einstellungen/kommunikation')
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabaseAdmin
    .from('kommunikation_mail_vorlagen')
    .insert(row)
    .select('id')
    .single()
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/kommunikation')
  return { ok: true, id: data.id as string }
}

export async function deleteKommunikationMailVorlage(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin.from('kommunikation_mail_vorlagen').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/kommunikation')
  return { ok: true }
}

export async function getMailComposeDraft(
  ctx: MailComposeContext
): Promise<
  | {
      ok: true
      to: string
      cc: string[]
      betreff: string
      bodyHtml: string
      anrede: MailAnrede
      statusLink: string | null
    }
  | { ok: false; message: string }
> {
  const to = (ctx.defaultTo ?? '').trim()

  const anrede = mailAnredeFromKundeTyp(ctx.kundeTyp)
  const statusLink =
    ctx.statusLink ??
    (ctx.leadId ? await projektOderStatusLink(ctx.leadId) : null)

  return {
    ok: true,
    to,
    cc: ctx.defaultCc ?? [],
    betreff: '',
    bodyHtml: defaultFreitextMailBody(anrede),
    anrede,
    statusLink,
  }
}

export async function previewFreitextKundenMail(input: {
  ctx: MailComposeContext
  betreff: string
  bodyHtml: string
  anrede?: MailAnrede | null
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const branding = await getMailBranding(supabaseAdmin)
  const statusLink =
    input.ctx.statusLink ??
    (input.ctx.leadId ? await projektOderStatusLink(input.ctx.leadId) : null)

  const html = buildFreitextKundenMailHtml({
    displayName: input.ctx.kundeName,
    bodyHtml: input.bodyHtml,
    anrede: input.anrede,
    kundeTyp: input.ctx.kundeTyp,
    branding,
    statusLink,
  })
  return { ok: true, html }
}

export async function sendFreitextKundenMail(input: {
  ctx: MailComposeContext
  to: string
  cc?: string[]
  betreff: string
  bodyHtml: string
  anrede?: MailAnrede | null
}): Promise<{ ok: true; emailLogId: string } | { ok: false; message: string }> {
  const toList = input.to
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const toPrimary = toList[0]
  if (!toPrimary) return { ok: false, message: 'Bitte mindestens einen Empfänger angeben.' }
  if (!input.betreff.trim()) return { ok: false, message: 'Betreff fehlt' }

  const ccList = [...(input.cc ?? []), ...toList.slice(1)].filter(Boolean)
  const emailLogId = randomUUID()
  const branding = await getMailBranding(supabaseAdmin)
  const statusLink =
    input.ctx.statusLink ??
    (input.ctx.leadId ? await projektOderStatusLink(input.ctx.leadId) : null)

  const html = buildFreitextKundenMailHtml({
    displayName: input.ctx.kundeName,
    bodyHtml: input.bodyHtml,
    anrede: input.anrede,
    kundeTyp: input.ctx.kundeTyp,
    branding,
    statusLink,
    emailLogId,
  })

  const typ = freitextMailTyp(input.ctx.kontextTyp)
  const r = await sendMail({
    typ,
    an: toPrimary,
    cc: ccList.length ? ccList : undefined,
    bcc: [KUNDE_MAIL_BCC],
    anName: input.ctx.kundeName,
    betreff: input.betreff.trim(),
    html,
    kundeId: input.ctx.kundeId?.trim() ? input.ctx.kundeId : null,
    leadId: input.ctx.leadId ?? null,
    angebotId: input.ctx.angebotId ?? null,
    auftragId: input.ctx.auftragId ?? null,
    rechnungId: input.ctx.rechnungId ?? null,
    kontextTyp: input.ctx.kontextTyp,
    emailLogId,
  })

  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }

  if (input.ctx.leadId) {
    await logLeadEmailTimelineEvent({
      leadId: input.ctx.leadId,
      emailLogId: r.emailLogId ?? emailLogId,
      titel: 'E-Mail gesendet',
      beschreibung: `${input.betreff.trim()} · An ${toPrimary}`,
    })
    if (input.ctx.kontextTyp === 'anfrage') {
      await markLeadKontaktiertWennNeu(input.ctx.leadId, 'E-Mail an Kunden')
    }
  }

  revalidateKommunikationPaths({
    kundeId: input.ctx.kundeId?.trim() ? input.ctx.kundeId : null,
    leadId: input.ctx.leadId,
    angebotId: input.ctx.angebotId,
    auftragId: input.ctx.auftragId,
    rechnungId: input.ctx.rechnungId,
  })

  return { ok: true, emailLogId: r.emailLogId ?? emailLogId }
}

/** Kontext aus Anfrage laden */
export async function mailComposeContextFromLead(
  leadId: string
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_email, kontakt_name, kunde_id, kundentyp, kunden!kunde_id(id, name, email, typ)')
    .eq('id', leadId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Anfrage nicht gefunden' }

  const kundenRaw = data.kunden as
    | { id: string; name: string; email: string | null; typ: string | null }
    | { id: string; name: string; email: string | null; typ: string | null }[]
    | null
  const kunden = Array.isArray(kundenRaw) ? kundenRaw[0] : kundenRaw
  const kundeId = kunden?.id ?? data.kunde_id
  if (!kundeId) return { ok: false, message: 'Kein Kunde verknüpft' }

  const email = (kunden?.email ?? data.kontakt_email ?? '').trim()
  const name = (kunden?.name ?? data.kontakt_name ?? 'Kundin/Kunde').trim()

  return {
    ok: true,
    ctx: {
      kontextTyp: 'anfrage',
      kundeId,
      kundeName: name,
      kundeTyp: kunden?.typ ?? data.kundentyp,
      leadId,
      defaultTo: email,
      defaultCc: [],
    },
  }
}

export async function mailComposeContextFromAngebot(
  angebotId: string
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select('id, lead_id, kunde_id, kunden(id, name, email, typ)')
    .eq('id', angebotId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Angebot nicht gefunden' }

  const kundenRaw = data.kunden as
    | { id: string; name: string; email: string | null; typ: string | null }
    | { id: string; name: string; email: string | null; typ: string | null }[]
    | null
  const kunden = Array.isArray(kundenRaw) ? kundenRaw[0] : kundenRaw
  const kundeId = kunden?.id ?? data.kunde_id
  if (!kundeId) return { ok: false, message: 'Kein Kunde verknüpft' }

  return {
    ok: true,
    ctx: {
      kontextTyp: 'angebot',
      kundeId,
      kundeName: (kunden?.name ?? 'Kundin/Kunde').trim(),
      kundeTyp: kunden?.typ,
      leadId: data.lead_id,
      angebotId,
      defaultTo: (kunden?.email ?? '').trim(),
      defaultCc: [],
    },
  }
}

export async function mailComposeContextFromAuftrag(
  auftragId: string
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, lead_id, kunde_id, kunden(id, name, email, typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Auftrag nicht gefunden' }

  const kundenRaw = data.kunden as
    | { id: string; name: string; email: string | null; typ: string | null }
    | { id: string; name: string; email: string | null; typ: string | null }[]
    | null
  const kunden = Array.isArray(kundenRaw) ? kundenRaw[0] : kundenRaw
  const kundeId = kunden?.id ?? data.kunde_id
  if (!kundeId) return { ok: false, message: 'Kein Kunde verknüpft' }

  return {
    ok: true,
    ctx: {
      kontextTyp: 'auftrag',
      kundeId,
      kundeName: (kunden?.name ?? 'Kundin/Kunde').trim(),
      kundeTyp: kunden?.typ,
      leadId: data.lead_id,
      auftragId,
      defaultTo: (kunden?.email ?? '').trim(),
      defaultCc: [],
    },
  }
}

export async function mailComposeContextFromRechnung(
  rechnungId: string
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('rechnungen')
    .select('id, kunde_id, auftrag_id, kunden(id, name, email, typ), auftraege(lead_id)')
    .eq('id', rechnungId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Rechnung nicht gefunden' }

  const kundenRaw = data.kunden as
    | { id: string; name: string; email: string | null; typ: string | null }
    | { id: string; name: string; email: string | null; typ: string | null }[]
    | null
  const kunden = Array.isArray(kundenRaw) ? kundenRaw[0] : kundenRaw
  const kundeId = kunden?.id ?? data.kunde_id
  if (!kundeId) return { ok: false, message: 'Kein Kunde verknüpft' }

  const auftragRaw = data.auftraege as { lead_id?: string | null } | { lead_id?: string | null }[] | null
  const auftrag = Array.isArray(auftragRaw) ? auftragRaw[0] : auftragRaw

  return {
    ok: true,
    ctx: {
      kontextTyp: 'rechnung',
      kundeId,
      kundeName: (kunden?.name ?? 'Kundin/Kunde').trim(),
      kundeTyp: kunden?.typ,
      leadId: auftrag?.lead_id ?? null,
      auftragId: data.auftrag_id,
      rechnungId,
      defaultTo: (kunden?.email ?? '').trim(),
      defaultCc: [],
    },
  }
}

export async function mailComposeContextFromKunde(
  kundeId: string
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, email, typ')
    .eq('id', kundeId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: 'Kunde nicht gefunden' }

  return {
    ok: true,
    ctx: {
      kontextTyp: 'kunde',
      kundeId,
      kundeName: (data.name ?? 'Kundin/Kunde').trim(),
      kundeTyp: data.typ,
      defaultTo: (data.email ?? '').trim(),
      defaultCc: [],
    },
  }
}

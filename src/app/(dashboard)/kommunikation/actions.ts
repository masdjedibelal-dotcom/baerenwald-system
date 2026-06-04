'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/mail-branding'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  buildFreitextKundenMailHtml,
  defaultFreitextMailBody,
} from '@/lib/mail/freitext-kunden-mail'
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
import { KUNDE_MAIL_BCC } from '@/lib/mail-constants'

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
  let q = supabaseAdmin
    .from('email_log')
    .select(
      'id, typ, kontext_typ, richtung, an_email, von_email, cc_email, betreff, created_at, status'
    )
    .order('created_at', { ascending: false })
    .limit(80)

  if (filter.rechnungId) q = q.eq('rechnung_id', filter.rechnungId)
  else if (filter.angebotId) q = q.eq('angebot_id', filter.angebotId)
  else if (filter.auftragId) q = q.eq('auftrag_id', filter.auftragId)
  else if (filter.leadId) q = q.eq('lead_id', filter.leadId)
  else if (filter.kundeId) q = q.eq('kunde_id', filter.kundeId)
  else return []

  const { data, error } = await q
  if (error) {
    console.warn('[loadKommunikationListe]', error.message)
    return []
  }
  return (data ?? []) as KommunikationListeZeile[]
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
    .select('id, kontakt_email, kontakt_name, kunde_id, kundentyp, kunden(id, name, email, typ)')
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

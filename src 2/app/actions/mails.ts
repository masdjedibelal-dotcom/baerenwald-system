'use server'

import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  mailAnfrageBestaetigung,
  mailHtmlBase,
  mailUpdateHinweis,
  mailZahlungserinnerung,
} from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { emailLogHtmlMarker } from '@/lib/kommunikation/types'
import { logLeadEmailTimelineEvent } from '@/lib/kommunikation/log-lead-email-timeline'
import type { MailBranding } from '@/lib/mail-branding'
import { projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import { zahlungserinnerungZahlbarBis } from '@/lib/mail/zahlungserinnerung-mail'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { buildBesichtigungTerminMail } from '@/lib/mail/besichtigung-termin-mail'
import {
  buildPortalLoginLink,
  buildPartnerDashboardLink,
  buildPartnerPortalButton,
  defaultPortalInviteBetreff,
  defaultPortalInviteText,
  defaultPartnerPortalInviteBetreff,
  defaultPartnerPortalInviteText,
  type PortalMailAudience,
} from '@/lib/portal-utils'

/** Website-Lead: Bestätigungsmail; mit `force` auch für manuell erfasste Anfragen (Checkbox). */
export async function sendAnfrageBestaetigung(
  leadId: string,
  force = false
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kanal, anlass, kontakt_email, kontakt_name, bereiche, situation, plz, preis_min, preis_max, kunde_id, kundentyp, kunden!kunde_id(name, typ), kunden_objekte(titel)'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) {
    return { ok: false, message: error?.message ?? 'Lead nicht gefunden' }
  }

  const kanal = (lead as { kanal?: string }).kanal
  if (kanal !== 'website' && !force) return { ok: true }

  const email = String((lead as { kontakt_email?: string | null }).kontakt_email ?? '').trim()
  if (!email) return { ok: true }

  const branding = await getMailBranding(supabaseAdmin)
  const kunden = (lead as { kunden?: { name?: string } | null }).kunden
  const name =
    String((lead as { kontakt_name?: string | null }).kontakt_name ?? '').trim() ||
    String(kunden?.name ?? 'Kundin/Kunde')

  const bereiche = (lead as { bereiche?: string[] | null }).bereiche ?? null
  const plz = String((lead as { plz?: string | null }).plz ?? '').trim()
  const anfrageRef = plz || String(leadId).slice(0, 8).toUpperCase()
  const kundeTyp = resolveAngebotKundeTyp(
    (lead as { kunden?: { typ?: string | null } | null }).kunden?.typ,
    (lead as { kundentyp?: string | null }).kundentyp
  )
  const tpl = mailAnfrageBestaetigung(
    {
      name,
      anfrageRef,
      situation: (lead as { situation?: string | null }).situation,
      bereiche,
      preis_min: (lead as { preis_min?: number | null }).preis_min,
      preis_max: (lead as { preis_max?: number | null }).preis_max,
      quelle: force || kanal !== 'website' ? 'crm' : 'website',
      kundeTyp,
      anlass: (lead as { anlass?: string | null }).anlass as import('@/lib/types').LeadAnlass | null,
      objektTitel: (() => {
        const ko = (lead as { kunden_objekte?: { titel?: string } | { titel?: string }[] | null })
          .kunden_objekte
        const one = Array.isArray(ko) ? ko[0] : ko
        return one?.titel?.trim() || null
      })(),
    },
    branding
  )
  const r = await sendMail({
    typ: 'anfrage_bestaetigung',
    an: email,
    anName: name,
    betreff: tpl.betreff,
    html: tpl.html,
    leadId,
    kundeId: (lead as { kunde_id?: string | null }).kunde_id ?? null,
  })

  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true }
}

function formatDeDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}.${m}.${y}`
}

/** Vorschau der Termin-Bestätigungsmail (HTML + Betreff). */
export async function previewBesichtigungTerminMail(
  input: Parameters<typeof buildBesichtigungTerminMail>[0]
): Promise<
  | { ok: true; betreff: string; html: string; bodyText: string; defaultTo: string[] }
  | { ok: false; message: string }
> {
  const built = await buildBesichtigungTerminMail(input)
  if (!built.ok) return built
  return {
    ok: true,
    betreff: built.betreff,
    html: built.html,
    bodyText: built.bodyText,
    defaultTo: built.defaultTo,
  }
}

/** E-Mail an Kund:in nach Besichtigung / Termin aus dem CRM (Resend). */
export async function sendBesichtigungTerminBestaetigung(input: {
  leadId: string
  to: string | string[]
  cc?: string | string[]
  name: string
  terminTitel: string
  datum: string
  uhrzeitVon: string | null
  uhrzeitBis: string | null
  adresse: string | null
  notiz: string | null
  zugewiesenAn: string
  betreff?: string
  html?: string
  bodyText?: string | null
}): Promise<{ ok: true; emailLogId: string } | { ok: false; message: string }> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map((s) => s.trim()).filter(Boolean)
  if (!toList.length) return { ok: false, message: 'Keine E-Mail-Adresse unter An.' }

  const emailLogId = randomUUID()
  let betreff = input.betreff?.trim()
  let html = input.html?.trim()
  let kundeId: string | null = null

  if (!betreff || !html) {
    const built = await buildBesichtigungTerminMail({
      leadId: input.leadId,
      name: input.name,
      terminTitel: input.terminTitel,
      datum: input.datum,
      uhrzeitVon: input.uhrzeitVon,
      uhrzeitBis: input.uhrzeitBis,
      adresse: input.adresse,
      notiz: input.notiz,
      zugewiesenAn: input.zugewiesenAn,
      defaultTo: toList[0],
      bodyText: input.bodyText,
    })
    if (!built.ok) return built
    betreff = betreff || built.betreff
    html = html || built.html
    kundeId = built.kundeId
  } else {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('kunde_id')
      .eq('id', input.leadId)
      .maybeSingle()
    kundeId = (lead as { kunde_id?: string | null } | null)?.kunde_id ?? null
  }

  html = `${emailLogHtmlMarker(emailLogId)}${html!}`

  const r = await sendMail({
    typ: 'besichtigung_termin',
    an: toList.length === 1 ? toList[0] : toList,
    cc: input.cc,
    anName: input.name.trim() || null,
    betreff: betreff!,
    html: html!,
    leadId: input.leadId,
    kundeId,
    kontextTyp: 'anfrage',
    emailLogId,
    from: process.env.RESEND_FROM_ANFRAGEN ?? process.env.RESEND_FROM_EMAIL,
  })

  if (!r.success) {
    const hint =
      r.error === 'RESEND_API_KEY fehlt'
        ? 'RESEND_API_KEY fehlt in .env.local — bitte Resend-API-Key eintragen.'
        : (r.error ?? 'Versand fehlgeschlagen')
    return { ok: false, message: hint }
  }

  await logLeadEmailTimelineEvent({
    leadId: input.leadId,
    emailLogId: r.emailLogId ?? emailLogId,
    titel: 'Terminbestätigung gesendet',
    beschreibung: `${betreff!} · An ${toList.join(', ')}`,
  })

  return { ok: true, emailLogId: r.emailLogId ?? emailLogId }
}

function tageUeberfaellig(faelligAm: string): number {
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, mo, d] = parts
  const due = new Date(y, mo - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

type RechnungRow = {
  id: string
  rechnungsnummer: string
  brutto: number | null
  faellig_am: string | null
  erinnerung_7_sent_at: string | null
  erinnerung_21_sent_at: string | null
  intern_warnung_30_at: string | null
  kunde_id: string | null
  kunden: { name: string; email: string | null } | { name: string; email: string | null }[] | null
}

function normalizeKunde(
  k: RechnungRow['kunden']
): { name: string; email: string | null } | null {
  if (!k) return null
  if (Array.isArray(k)) return k[0] ?? null
  return k
}

/** Cron: Zahlungserinnerungen 7 / 21 Tage + interne 30-Tage-Warnung */
export async function sendZahlungserinnerungen(): Promise<{
  ok: true
  bearbeitet: number
  details: { id: string; aktion: string }[]
}> {
  const heute = new Date().toISOString().slice(0, 10)
  const branding = await getMailBranding(supabaseAdmin)
  const iban = branding.iban || process.env.EMAIL_FIRMEN_IBAN || ''

  const { data: rows, error } = await supabaseAdmin
    .from('rechnungen')
    .select(
      'id, rechnungsnummer, brutto, faellig_am, erinnerung_7_sent_at, erinnerung_21_sent_at, intern_warnung_30_at, kunde_id, kunden(name, email, typ)'
    )
    .eq('status', 'gesendet')
    .is('bezahlt_at', null)
    .not('faellig_am', 'is', null)
    .lt('faellig_am', heute)

  if (error) {
    console.error('[sendZahlungserinnerungen]', error.message)
    return { ok: true, bearbeitet: 0, details: [] }
  }

  const list = (rows ?? []) as RechnungRow[]
  const ergebnis: { id: string; aktion: string }[] = []

  for (const r of list) {
    if (!r.faellig_am) continue
    const tage = tageUeberfaellig(r.faellig_am)
    if (tage <= 0) continue

    const kunde = normalizeKunde(r.kunden)
    const name = kunde?.name ?? 'Kundin/Kunde'
    const email = kunde?.email?.trim() ?? ''
    const kundeTyp = (kunde as { typ?: string | null } | null)?.typ ?? null
    const brutto = r.brutto ?? 0
    const faelligFmt = formatDeDate(r.faellig_am)

    try {
      if (tage >= 7 && !r.erinnerung_7_sent_at && email) {
        const zahlbarBisIso = zahlungserinnerungZahlbarBis(r.faellig_am)
        const zahlbarBisFmt = formatDeDate(zahlbarBisIso)
        const tpl = mailZahlungserinnerung(
          {
            name,
            nummer: r.rechnungsnummer,
            brutto,
            faelligAm: faelligFmt,
            zahlbarBis: zahlbarBisFmt,
            tageUeberfaellig: tage,
            stufe: 1,
            iban,
            kundeTyp,
          },
          branding
        )
        const send = await sendMail({
          typ: 'zahlungserinnerung',
          an: email,
          anName: name,
          betreff: tpl.betreff,
          html: tpl.html,
          kundeId: r.kunde_id,
          rechnungId: r.id,
        })
        if (send.success) {
          await supabaseAdmin
            .from('rechnungen')
            .update({
              erinnerung_7_sent_at: new Date().toISOString(),
              faellig_am: zahlbarBisIso,
              updated_at: new Date().toISOString(),
            })
            .eq('id', r.id)
          ergebnis.push({ id: r.id, aktion: 'erinnerung_7' })
        }
      }

      if (tage >= 21 && !r.erinnerung_21_sent_at && email) {
        const zahlbarBisIso = zahlungserinnerungZahlbarBis(r.faellig_am)
        const zahlbarBisFmt = formatDeDate(zahlbarBisIso)
        const tpl = mailZahlungserinnerung(
          {
            name,
            nummer: r.rechnungsnummer,
            brutto,
            faelligAm: faelligFmt,
            zahlbarBis: zahlbarBisFmt,
            tageUeberfaellig: tage,
            stufe: 2,
            iban,
            kundeTyp,
          },
          branding
        )
        const send = await sendMail({
          typ: 'zahlungserinnerung',
          an: email,
          anName: name,
          betreff: tpl.betreff,
          html: tpl.html,
          kundeId: r.kunde_id,
          rechnungId: r.id,
        })
        if (send.success) {
          await supabaseAdmin
            .from('rechnungen')
            .update({
              erinnerung_21_sent_at: new Date().toISOString(),
              faellig_am: zahlbarBisIso,
              updated_at: new Date().toISOString(),
            })
            .eq('id', r.id)
          ergebnis.push({ id: r.id, aktion: 'erinnerung_21' })
        }
      }

      if (tage >= 30 && !r.intern_warnung_30_at) {
        const msg = `[Intern] Rechnung ${r.rechnungsnummer} (${r.id}) ist seit ${tage} Tagen überfällig (Fälligkeit ${r.faellig_am}).`
        console.warn(msg)
        const intern = process.env.INTERNE_RECHNUNG_WARNUNG_EMAIL
        if (intern) {
          await sendMail({
            typ: 'intern_hinweis',
            an: intern,
            betreff: '[Intern] Bärenwald CRM — überfällige Rechnung',
            html: `<pre style="font-family:system-ui,sans-serif;font-size:13px;white-space:pre-wrap;">${msg
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</pre>`,
          })
        }
        await supabaseAdmin
          .from('rechnungen')
          .update({ intern_warnung_30_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', r.id)
        ergebnis.push({ id: r.id, aktion: 'intern_30' })
      }
    } catch (e) {
      console.error('[sendZahlungserinnerungen] Rechnung', r.id, e)
      ergebnis.push({ id: r.id, aktion: 'fehler' })
    }
  }

  return { ok: true, bearbeitet: ergebnis.length, details: ergebnis }
}

export async function buildKundenUpdateVorschau(auftragId: string): Promise<{
  betreff: string
  html: string
  an: string
} | null> {
  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select('kunden_token, kunden(name, email, typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error || !auf) return null
  let token = (auf as { kunden_token?: string | null }).kunden_token?.trim()
  if (!token) {
    const t = await ensureKundenTokenForAuftrag(auftragId)
    token = t ?? undefined
  }
  if (!token) return null
  const k = (auf as { kunden?: { name?: string; email?: string | null; typ?: string | null } | null })
    .kunden
  const name = String(k?.name ?? 'Kundin/Kunde').trim()
  const an = String(k?.email ?? '').trim()
  if (!an) return null
  const url = projektUrlFromToken(token)
  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailUpdateHinweis({ name, statusLink: url, kundeTyp: k?.typ ?? null }, branding)
  return { betreff: tpl.betreff, html: tpl.html, an }
}

export async function sendKundenUpdateMailFromAuftrag(input: {
  auftragId: string
  an: string
  betreff: string
  html: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunde_id')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  const r = await sendMail({
    typ: 'update_hinweis',
    an: input.an,
    betreff: input.betreff,
    html: input.html,
    auftragId: input.auftragId,
    kundeId: (auf as { kunde_id?: string | null }).kunde_id ?? null,
  })
  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function kundenPortalMailHtml(input: {
  name: string
  portalLink: string
  anrede: 'du' | 'sie'
  text: string
  branding: MailBranding
  portalAudience: PortalMailAudience
}): string {
  const greeting = input.anrede === 'sie'
    ? `Guten Tag ${escapeHtml(input.name)},`
    : `Hallo ${escapeHtml(input.name)},`
  const body = escapeHtml(input.text)
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, '<br/>'))
    .map((p) => `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${p}</p>`)
    .join('')
  const disclaimer =
    input.portalAudience === 'organisation'
      ? input.anrede === 'du'
        ? 'Du erhältst diese E-Mail mit Einladung zum Auftraggeber-Portal.'
        : 'Sie erhalten diese E-Mail mit Einladung zum Auftraggeber-Portal.'
      : input.anrede === 'du'
        ? 'Du erhältst diese E-Mail mit Einladung zu MeinBärenwald.'
        : 'Sie erhalten diese E-Mail mit Einladung zu MeinBärenwald.'
  const content = `
    <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${greeting}</p>
    ${body}
    <p style="font-size:13px;color:#6B7280;margin:12px 0 0;line-height:1.6;">
      ${
        input.anrede === 'du'
          ? 'Bei Fragen erreichst du uns jederzeit per Antwort auf diese E-Mail.'
          : 'Bei Fragen erreichen Sie uns jederzeit per Antwort auf diese E-Mail.'
      }
    </p>
  `
  return mailHtmlBase(
    content,
    defaultPortalInviteBetreff(input.anrede, {
      organisation: input.portalAudience === 'organisation',
    }),
    input.branding,
    disclaimer,
    {
      anrede: input.anrede,
      portalLink: input.portalLink,
      portalAudience: input.portalAudience,
    }
  )
}

export async function getKundenPortalMailDraft(
  kundeId: string
): Promise<
  | {
      ok: true
      to: string
      cc: string[]
      betreff: string
      text: string
      html: string
      portalLink: string
      anrede: 'du' | 'sie'
    }
  | { ok: false; message: string }
> {
  const { data: kunde, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, email, typ, portal_modus, org_anzeigename')
    .eq('id', kundeId)
    .maybeSingle()
  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden' }
  const to = String((kunde as { email?: string | null }).email ?? '').trim()
  if (!to) return { ok: false, message: 'Kunde hat keine E-Mail-Adresse.' }

  const istOrganisation = (kunde as { portal_modus?: string }).portal_modus === 'organisation'
  const orgName = (kunde as { org_anzeigename?: string | null }).org_anzeigename

  const portalLink = buildPortalLoginLink()
  const name = String((kunde as { name?: string | null }).name ?? 'Kundin/Kunde').trim()
  const branding = await getMailBranding(supabaseAdmin)
  const anrede = mailAnredeFromKundeTyp((kunde as { typ?: string | null }).typ)
  const betreff = defaultPortalInviteBetreff(anrede, { organisation: istOrganisation })
  const text = defaultPortalInviteText(anrede, { organisation: istOrganisation, orgName })
  const portalAudience: PortalMailAudience = istOrganisation ? 'organisation' : 'privat'
  const html = kundenPortalMailHtml({
    name,
    portalLink,
    anrede,
    text,
    branding,
    portalAudience,
  })
  return {
    ok: true,
    to,
    cc: [],
    betreff,
    text,
    html,
    portalLink,
    anrede,
  }
}

export async function sendKundenPortalLinkMail(input: {
  kundeId: string
  to: string
  cc?: string[]
  betreff: string
  text: string
  anrede?: 'du' | 'sie'
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.to.trim()) return { ok: false, message: 'Bitte Empfänger-Adresse angeben.' }
  const { data: kunde, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, typ, portal_modus')
    .eq('id', input.kundeId)
    .maybeSingle()
  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden' }

  const portalLink = buildPortalLoginLink()
  const branding = await getMailBranding(supabaseAdmin)
  const anrede =
    input.anrede === 'du' || input.anrede === 'sie'
      ? input.anrede
      : mailAnredeFromKundeTyp((kunde as { typ?: string | null }).typ)
  const portalAudience: PortalMailAudience =
    (kunde as { portal_modus?: string }).portal_modus === 'organisation'
      ? 'organisation'
      : 'privat'
  const html = kundenPortalMailHtml({
    name: String((kunde as { name?: string | null }).name ?? 'Kundin/Kunde').trim(),
    portalLink,
    anrede,
    text: input.text,
    branding,
    portalAudience,
  })

  const r = await sendMail({
    typ: 'update_hinweis',
    an: input.to.trim(),
    cc: input.cc ?? [],
    anName: String((kunde as { name?: string | null }).name ?? '').trim() || null,
    betreff: input.betreff.trim(),
    html,
    kundeId: input.kundeId,
  })
  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true }
}

export async function previewKundenPortalMail(input: {
  kundeId: string
  text: string
  anrede?: 'du' | 'sie'
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const { data: kunde, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, typ, portal_modus')
    .eq('id', input.kundeId)
    .maybeSingle()
  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden' }

  const portalLink = buildPortalLoginLink()
  const branding = await getMailBranding(supabaseAdmin)
  const anrede =
    input.anrede === 'du' || input.anrede === 'sie'
      ? input.anrede
      : mailAnredeFromKundeTyp((kunde as { typ?: string | null }).typ)
  const portalAudience: PortalMailAudience =
    (kunde as { portal_modus?: string }).portal_modus === 'organisation'
      ? 'organisation'
      : 'privat'
  const html = kundenPortalMailHtml({
    name: String((kunde as { name?: string | null }).name ?? 'Kundin/Kunde').trim(),
    portalLink,
    anrede,
    text: input.text,
    branding,
    portalAudience,
  })
  return { ok: true, html }
}

function partnerPortalMailHtml(input: {
  name: string
  portalLink: string
  text: string
  branding: MailBranding
}): string {
  const greeting = `Hallo ${escapeHtml(input.name)},`
  const body = escapeHtml(input.text)
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, '<br/>'))
    .map((p) => `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${p}</p>`)
    .join('')
  const portal = buildPartnerPortalButton(input.portalLink)
  const content = `
    <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${greeting}</p>
    ${body}
    ${portal}
    <p style="font-size:13px;color:#6B7280;margin:12px 0 0;line-height:1.6;">
      Bei Fragen erreichst du uns jederzeit per Antwort auf diese E-Mail.
    </p>
  `
  return mailHtmlBase(
    content,
    defaultPartnerPortalInviteBetreff(),
    input.branding,
    'Du erhältst diese E-Mail mit Einladung zum Partner-Portal.',
    { skipMeinBaerenwaldPs: true, anrede: 'du' }
  )
}

export async function getPartnerPortalMailDraft(
  handwerkerId: string
): Promise<
  | {
      ok: true
      to: string
      cc: string[]
      betreff: string
      text: string
      html: string
      portalLink: string
    }
  | { ok: false; message: string }
> {
  const { data: hw, error } = await supabaseAdmin
    .from('handwerker')
    .select('id, name, email')
    .eq('id', handwerkerId)
    .maybeSingle()
  if (error || !hw) return { ok: false, message: error?.message ?? 'Handwerker nicht gefunden' }
  const to = String((hw as { email?: string | null }).email ?? '').trim()
  if (!to) return { ok: false, message: 'Handwerker hat keine E-Mail-Adresse.' }

  const portalLink = buildPartnerDashboardLink()
  const name = String((hw as { name?: string | null }).name ?? 'Partner').trim()
  const branding = await getMailBranding(supabaseAdmin)
  const betreff = defaultPartnerPortalInviteBetreff()
  const text = defaultPartnerPortalInviteText()
  const html = partnerPortalMailHtml({ name, portalLink, text, branding })
  return {
    ok: true,
    to,
    cc: [],
    betreff,
    text,
    html,
    portalLink,
  }
}

export async function sendPartnerPortalLinkMail(input: {
  handwerkerId: string
  to: string
  cc?: string[]
  betreff: string
  text: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.to.trim()) return { ok: false, message: 'Bitte Empfänger-Adresse angeben.' }
  const { data: hw, error } = await supabaseAdmin
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (error || !hw) return { ok: false, message: error?.message ?? 'Handwerker nicht gefunden' }

  const portalLink = buildPartnerDashboardLink()
  const branding = await getMailBranding(supabaseAdmin)
  const html = partnerPortalMailHtml({
    name: String((hw as { name?: string | null }).name ?? 'Partner').trim(),
    portalLink,
    text: input.text,
    branding,
  })

  const r = await sendMail({
    typ: 'handwerker_portal',
    an: input.to.trim(),
    cc: input.cc ?? [],
    anName: String((hw as { name?: string | null }).name ?? '').trim() || null,
    betreff: input.betreff.trim(),
    html,
    kontextTyp: 'handwerker',
  })
  if (!r.success) return { ok: false, message: r.error ?? 'Versand fehlgeschlagen' }
  return { ok: true }
}

export async function previewPartnerPortalMail(input: {
  handwerkerId: string
  text: string
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const { data: hw, error } = await supabaseAdmin
    .from('handwerker')
    .select('id, name')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  if (error || !hw) return { ok: false, message: error?.message ?? 'Handwerker nicht gefunden' }

  const portalLink = buildPartnerDashboardLink()
  const branding = await getMailBranding(supabaseAdmin)
  const html = partnerPortalMailHtml({
    name: String((hw as { name?: string | null }).name ?? 'Partner').trim(),
    portalLink,
    text: input.text,
    branding,
  })
  return { ok: true, html }
}

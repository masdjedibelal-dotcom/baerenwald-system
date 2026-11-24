import 'server-only'

import { Resend } from 'resend'

import { LEAD_DOKUMENTE_BUCKET } from '@/lib/anfragen/lead-dokumente-helpers'
import { sendInternNotifyEmail } from '@/lib/angebote/emails'
import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { insertEmailLogRow } from '@/lib/kommunikation/insert-email-log'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { sendMail } from '@/lib/mail-service'
import { mailHtmlBase } from '@/lib/mail-templates'
import { funktionAn } from '@/lib/marke'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { C } from '@/lib/tokens/colors'

/**
 * Aufträge per E-Mail: Die Verwaltung schickt aus ihrem eigenen Programm (casavi, Outlook …)
 * an ihre Auftragsadresse — daraus wird eine Anfrage im CRM, mit Anhängen und Eingangsbestätigung.
 *
 * Zuordnung: 1) eigene Adresse je Verwaltung `auftrag+<org-kennung>@…` (sicher, auch bei noreply-Absendern)
 *            2) allgemeine Adresse: Absender = Person / Ansprechpartner / Haupt-Mail / Firmendomain der Verwaltung.
 * Unbekannt → keine Anfrage (Spam-Schutz), sondern Hinweis-Mail ans Team mit Inhalt.
 *
 * Env: AUFTRAG_EINGANG_EMAIL (z. B. auftrag@eingang.servus-teo.de) — Domain muss bei Resend als Empfangsdomain eingerichtet sein.
 */

const FREEMAILER = new Set([
  'gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'web.de', 't-online.de', 'outlook.com', 'outlook.de',
  'hotmail.com', 'hotmail.de', 'live.de', 'live.com', 'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com', 'aol.com',
  'freenet.de', 'posteo.de', 'mail.de', 'online.de', 'arcor.de', 'proton.me', 'protonmail.com',
])

function basisAdresse(): { lokal: string; domain: string } | null {
  const raw = process.env.AUFTRAG_EINGANG_EMAIL?.trim().toLowerCase()
  const m = raw?.match(/^([a-z0-9._-]+)@([a-z0-9.-]+\.[a-z]{2,})$/)
  return m ? { lokal: m[1]!, domain: m[2]! } : null
}

/** Auftragsadresse einer Verwaltung (null, wenn der Mail-Eingang nicht eingerichtet ist). */
export function auftragsAdresseFuerOrg(orgKennung: string | null | undefined): string | null {
  const b = basisAdresse()
  const k = orgKennung?.trim().toLowerCase()
  if (!b) return null
  return k ? `${b.lokal}+${k}@${b.domain}` : `${b.lokal}@${b.domain}`
}

function adresseAus(s: string): string {
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1]! : s).trim().toLowerCase()
}

function nameAus(s: string): string | null {
  const m = s.match(/^\s*"?([^"<]+?)"?\s*</)
  return m ? m[1]!.trim() : null
}

/** Ist eine der Empfänger-Adressen unsere Auftragsadresse? → Kennung (oder '' für die allgemeine). */
export function auftragsKennungAusEmpfaengern(empfaenger: string[]): string | null {
  const b = basisAdresse()
  if (!b) return null
  for (const roh of empfaenger) {
    const a = adresseAus(roh)
    const [lokal, domain] = a.split('@')
    if (!lokal || domain !== b.domain) continue
    if (lokal === b.lokal) return ''
    if (lokal.startsWith(`${b.lokal}+`)) return lokal.slice(b.lokal.length + 1)
  }
  return null
}

type Org = { id: string; name: string | null; org_anzeigename: string | null; email: string | null; org_kennung?: string | null }

async function orgPerKennung(kennung: string): Promise<Org | null> {
  if (!kennung) return null
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, org_anzeigename, email, typ, org_kennung')
    .ilike('org_kennung', kennung)
    .limit(1)
    .maybeSingle()
  if (error) logDbError('teo/hv/auftrag-per-mail:kennung', error)
  return (data as Org | null) ?? null
}

async function istHv(kundeId: string): Promise<Org | null> {
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, org_anzeigename, email, typ, org_kennung')
    .eq('id', kundeId)
    .maybeSingle()
  if (error) logDbError('teo/hv/auftrag-per-mail:kunde', error)
  const t = String((data as { typ?: string } | null)?.typ ?? '').toLowerCase()
  return data && (t === 'hausverwaltung' || t === 'verwaltung') ? (data as Org) : null
}

/** Absender → Verwaltung (Personen, Ansprechpartner, Haupt-Mail, Firmendomain). Nur eindeutige Treffer. */
async function orgPerAbsender(absender: string): Promise<Org | null> {
  const mail = absender.toLowerCase()
  const kandidaten = new Set<string>()
  const [mitglieder, ap, haupt] = await Promise.all([
    supabaseAdmin.from('kunden_mitglieder').select('kunde_id').ilike('email', mail).eq('aktiv', true),
    supabaseAdmin.from('kunden_ansprechpartner').select('kunde_id').ilike('email', mail),
    supabaseAdmin.from('kunden').select('id').ilike('email', mail).in('typ', ['hausverwaltung', 'verwaltung']),
  ])
  for (const r of [mitglieder, ap, haupt]) if (r.error) logDbError('teo/hv/auftrag-per-mail:absender', r.error)
  for (const r of (mitglieder.data ?? []) as { kunde_id: string }[]) kandidaten.add(r.kunde_id)
  for (const r of (ap.data ?? []) as { kunde_id: string }[]) kandidaten.add(r.kunde_id)
  for (const r of (haupt.data ?? []) as { id: string }[]) kandidaten.add(r.id)

  const hvs: Org[] = []
  for (const id of kandidaten) {
    const o = await istHv(id)
    if (o) hvs.push(o)
  }
  if (hvs.length === 1) return hvs[0]!
  if (hvs.length > 1) return null

  // Firmendomain (keine Freemailer): Haupt-Mail der Verwaltung mit gleicher Domain
  const domain = mail.split('@')[1]
  if (!domain || FREEMAILER.has(domain)) return null
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, org_anzeigename, email, org_kennung')
    .ilike('email', `%@${domain}`)
    .in('typ', ['hausverwaltung', 'verwaltung'])
    .limit(2)
  if (error) logDbError('teo/hv/auftrag-per-mail:domain', error)
  return data?.length === 1 ? (data[0] as Org) : null
}

function normStrasse(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/str\.(?=\s|$|\d)/g, 'strasse')
    .replace(/[^a-z0-9äöü]+/g, ' ')
    .trim()
}

/** Objekt der Verwaltung, dessen Straße (+ Hausnummer) im Betreff/Text steht — nur bei genau einem Treffer. */
async function objektVorschlag(orgId: string, text: string) {
  const { data, error } = await supabaseAdmin
    .from('kunden_objekte')
    .select('id, titel, strasse, hausnummer, plz, ort')
    .eq('kunde_id', orgId)
  if (error) logDbError('teo/hv/auftrag-per-mail:objekte', error)
  const t = ` ${normStrasse(text)} `
  type O = { id: string; titel: string | null; strasse: string | null; hausnummer: string | null; plz: string | null; ort: string | null }
  const treffer = ((data ?? []) as O[]).filter((o) => {
    const str = o.strasse ? normStrasse(o.strasse) : ''
    if (str.length < 4 || !t.includes(` ${str}`)) return false
    const nr = o.hausnummer?.trim().toLowerCase()
    return !nr || t.includes(` ${str} ${nr}`) || t.includes(` ${str}${nr}`)
  })
  return treffer.length === 1 ? treffer[0]! : null
}

function textAusHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export type EingehendeMail = {
  emailId: string
  from: string
  to: string[]
  subject: string
  html: string | null
  text: string | null
  messageId: string | null
  inReplyTo: string | null
  attachments: { id: string; filename: string | null; content_type: string; size: number }[]
}

/** Vollständige eingehende Mail bei Resend holen (Webhook liefert nur Eckdaten). */
export async function ladeEingehendeMail(emailId: string): Promise<EingehendeMail | null> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key || !emailId) return null
  const resend = new Resend(key)
  const r = await resend.emails.receiving.get(emailId)
  if (r.error || !r.data) {
    console.warn('[auftrag-per-mail] Mail laden', r.error)
    return null
  }
  const d = r.data
  return {
    emailId,
    from: d.from,
    to: [...(d.to ?? []), ...(d.cc ?? []), ...(d.received_for ?? [])],
    subject: d.subject ?? '',
    html: d.html,
    text: d.text,
    messageId: d.message_id ?? null,
    inReplyTo: (d.headers?.['in-reply-to'] ?? d.headers?.['In-Reply-To'] ?? '').trim() || null,
    attachments: (d.attachments ?? []).map((a) => ({ id: a.id, filename: a.filename, content_type: a.content_type, size: a.size })),
  }
}

export async function anhaengeSpeichern(
  leadId: string,
  mail: EingehendeMail
): Promise<{ fotos: string[]; dateien: number; liste: { name: string; url: string }[] }> {
  const key = process.env.RESEND_API_KEY?.trim()
  const liste2: { name: string; url: string }[] = []
  if (!key || !mail.attachments.length) return { fotos: [], dateien: 0, liste: liste2 }
  const resend = new Resend(key)
  const liste = await resend.emails.receiving.attachments.list({ emailId: mail.emailId })
  if (liste.error || !liste.data) {
    console.warn('[auftrag-per-mail] Anhänge laden', liste.error)
    return { fotos: [], dateien: 0, liste: liste2 }
  }
  const fotos: string[] = []
  let dateien = 0
  for (const a of liste.data.data.slice(0, 15)) {
    if (a.content_disposition === 'inline' && a.size < 15_000) continue // Signatur-Logos
    if (a.size > 15 * 1024 * 1024) continue
    const typ = a.content_type || 'application/octet-stream'
    if (!/^(image\/|application\/pdf)/.test(typ)) continue
    try {
      const res = await fetch(a.download_url)
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      const name = (a.filename || `anhang-${dateien + 1}`).replace(/[^\w.\-]+/g, '_').slice(0, 80)
      const pfad = `${leadId}/${Date.now()}-mail-${name}`
      const { error: upErr } = await supabaseAdmin.storage.from(LEAD_DOKUMENTE_BUCKET).upload(pfad, buf, { contentType: typ, upsert: false })
      if (upErr) {
        logDbError('teo/hv/auftrag-per-mail:upload', upErr)
        continue
      }
      const url = supabaseAdmin.storage.from(LEAD_DOKUMENTE_BUCKET).getPublicUrl(pfad).data.publicUrl
      const { error: dokErr } = await supabaseAdmin
        .from('lead_dokumente')
        .insert({ lead_id: leadId, name: a.filename || name, datei_url: url, groesse_bytes: a.size, art: 'sonstiges' })
      if (dokErr) logDbError('teo/hv/auftrag-per-mail:dokument', dokErr)
      if (typ.startsWith('image/')) fotos.push(url)
      liste2.push({ name: a.filename || name, url })
      dateien++
    } catch (e) {
      console.warn('[auftrag-per-mail] Anhang', a.filename, e)
    }
  }
  return { fotos, dateien, liste: liste2 }
}

function bestaetigungsMail(opts: { referenz: string; betreff: string; objekt: string | null }, branding: Awaited<ReturnType<typeof getMailBranding>>) {
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Ihr Auftrag ist bei uns eingegangen${opts.objekt ? ` (<strong>${esc(opts.objekt)}</strong>)` : ''}. Wir melden uns mit Termin oder Angebot.</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Vorgang: <strong>${esc(opts.referenz)}</strong></p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Wenn Sie auf diese Mail antworten, landet Ihre Nachricht direkt bei diesem Vorgang.</p>`
  return {
    betreff: `Auftrag erhalten: ${opts.betreff || 'Ihr Auftrag'} [${opts.referenz}]`,
    html: mailHtmlBase(body, `Auftrag erhalten · ${opts.referenz}`, branding, undefined, { anrede: 'sie', skipMeinBaerenwaldPs: true }),
  }
}

export type AuftragPerMailErgebnis =
  | { ok: true; leadId: string }
  | { ok: true; uebersprungen: 'doppelt' | 'nicht_zugeordnet' | 'aus' }
  | { ok: false; message: string }

/** „[A1B2C3D4]“ im Betreff → bestehender Vorgang (Antwort auf Eingangsbestätigung o. Ä.). */
async function vorgangPerReferenz(betreff: string, orgId: string | null): Promise<string | null> {
  const m = betreff.match(/\[([0-9A-Fa-f]{8})\]/)
  if (!m) return null
  const ref = m[1]!.toLowerCase()
  let q = supabaseAdmin
    .from('leads')
    .select('id')
    .gte('id', `${ref}-0000-0000-0000-000000000000`)
    .lte('id', `${ref}-ffff-ffff-ffff-ffffffffffff`)
    .limit(2)
  if (orgId) q = q.eq('auftraggeber_kunde_id', orgId)
  const { data, error } = await q
  if (error) logDbError('teo/hv/auftrag-per-mail:referenz', error)
  return data?.length === 1 ? String(data[0]!.id) : null
}

/** Neue Mail an die Auftragsadresse → Anfrage im CRM. */
export async function auftragAusMail(mail: EingehendeMail, kennung: string): Promise<AuftragPerMailErgebnis> {
  if (!funktionAn('hvWorkflow')) return { ok: true, uebersprungen: 'aus' }

  // Doppelt zugestellt? (gleiche Message-ID schon verarbeitet)
  if (mail.messageId) {
    const { data: schon, error } = await supabaseAdmin.from('email_log').select('id').eq('internet_message_id', mail.messageId).limit(1)
    if (error) logDbError('teo/hv/auftrag-per-mail:dedupe', error)
    if (schon?.length) return { ok: true, uebersprungen: 'doppelt' }
  }

  const absender = adresseAus(mail.from)
  const absenderName = nameAus(mail.from)
  const org = (kennung ? await orgPerKennung(kennung) : null) ?? (await orgPerAbsender(absender))
  const text = (mail.text?.trim() || (mail.html ? textAusHtml(mail.html) : '')).slice(0, 8000)
  const betreff = mail.subject.trim()

  if (!org) {
    // Kein Spam im CRM: Team bekommt den Inhalt zur Prüfung
    await sendInternNotifyEmail({
      subject: `Auftrag per Mail — Absender unbekannt: ${betreff || '(ohne Betreff)'}`,
      html: `<p>An die Auftragsadresse kam eine Mail, die keiner Hausverwaltung zugeordnet werden konnte. Bitte prüfen und ggf. als Anfrage anlegen bzw. die Adresse bei der Verwaltung hinterlegen.</p>
        <p><strong>Von:</strong> ${esc(mail.from)}<br/><strong>Betreff:</strong> ${esc(betreff)}${kennung ? `<br/><strong>Kennung:</strong> ${esc(kennung)} (unbekannt)` : ''}</p>
        <pre style="white-space:pre-wrap;font-family:inherit">${esc(text.slice(0, 4000))}</pre>`,
    })
    return { ok: true, uebersprungen: 'nicht_zugeordnet' }
  }

  // Antwort zu einem laufenden Vorgang? → in dessen Verlauf, keine neue Anfrage
  const bestehend = await vorgangPerReferenz(betreff, org.id)
  if (bestehend) {
    const { id: logId } = await insertEmailLogRow({
      typ: 'antwort',
      kontext_typ: null,
      richtung: 'empfangen',
      an_email: mail.to.join(', '),
      von_email: mail.from,
      betreff: betreff || '(Kein Betreff)',
      inhalt_html: mail.html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${esc(text)}</pre>`,
      status: 'empfangen',
      kunde_id: org.id,
      lead_id: bestehend,
      angebot_id: null,
      auftrag_id: null,
      rechnung_id: null,
      in_reply_to_log_id: null,
      internet_message_id: mail.messageId,
    })
    await anhaengeSpeichern(bestehend, mail)
    await insertLeadTimelineEvent(supabaseAdmin, {
      lead_id: bestehend,
      typ: 'email',
      titel: 'Nachricht der Verwaltung per E-Mail',
      beschreibung: `Von ${mail.from} · ${betreff}`,
      email_log_id: logId ?? null,
    })
    return { ok: true, leadId: bestehend }
  }

  const objekt = await objektVorschlag(org.id, `${betreff}\n${text}`)
  const beschreibung = [betreff, text].filter(Boolean).join('\n\n').slice(0, 8000)
  const kontaktName = absenderName || absender

  const { data: leadRow, error: leadErr } = await supabaseAdmin
    .from('leads')
    .insert({
      kunde_id: org.id,
      auftraggeber_kunde_id: org.id,
      kunde_objekt_id: objekt?.id ?? null,
      anlass: 'meldung',
      erfassung_von: 'organisation',
      kanal: 'email',
      status: 'neu',
      situation: 'reparatur',
      kundentyp: 'hausverwaltung',
      plz: objekt?.plz ?? null,
      strasse: objekt?.strasse ?? null,
      hausnummer: objekt?.hausnummer ?? null,
      kontakt_name: kontaktName,
      kontakt_email: absender,
      kontakt_nachricht: text.slice(0, 4000) || null,
      melder_name: kontaktName,
      melder_email: absender,
      notizen: beschreibung || null,
      hv_meldung_status: 'angebot_eingefordert',
      org_freigabe_status: 'nicht_noetig',
      vorgang_phase: 'eingegangen',
      funnel_daten: { quelle: 'email', betreff, beschreibung, fotos: [] as string[], ...(objekt ? {} : { objekt_offen: true }) },
    })
    .select('id')
    .single()
  if (leadErr || !leadRow) {
    logDbError('teo/hv/auftrag-per-mail:lead', leadErr)
    return { ok: false, message: leadErr?.message ?? 'Anfrage konnte nicht angelegt werden.' }
  }
  const leadId = String(leadRow.id)
  const referenz = leadId.slice(0, 8).toUpperCase()

  // Eingegangene Mail im Verlauf (auch für Doppel-Erkennung)
  const { id: logId } = await insertEmailLogRow({
    typ: 'auftrag_eingang',
    kontext_typ: null,
    richtung: 'empfangen',
    an_email: mail.to.join(', '),
    von_email: mail.from,
    betreff: betreff || '(Kein Betreff)',
    inhalt_html: mail.html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${esc(text)}</pre>`,
    status: 'empfangen',
    kunde_id: org.id,
    lead_id: leadId,
    angebot_id: null,
    auftrag_id: null,
    rechnung_id: null,
    in_reply_to_log_id: null,
    internet_message_id: mail.messageId,
  })

  const anh = await anhaengeSpeichern(leadId, mail)
  if (anh.fotos.length) {
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ funnel_daten: { quelle: 'email', betreff, beschreibung, fotos: anh.fotos, ...(objekt ? {} : { objekt_offen: true }) } })
      .eq('id', leadId)
    if (error) logDbError('teo/hv/auftrag-per-mail:fotos', error)
  }

  await insertLeadTimelineEvent(supabaseAdmin, {
    lead_id: leadId,
    typ: 'email',
    titel: 'Auftrag per E-Mail eingegangen',
    beschreibung: [
      `Von ${mail.from}`,
      objekt ? `Objekt erkannt: ${objekt.titel || objekt.strasse}` : 'Objekt nicht erkannt — bitte zuordnen',
      anh.dateien ? `${anh.dateien} Anhang/Anhänge übernommen` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    email_log_id: logId ?? null,
  })

  // Eingangsbestätigung an den Absender (Antworten darauf landen über die Verlaufs-Zuordnung im Vorgang)
  try {
    const branding = await getMailBranding(supabaseAdmin)
    const tpl = bestaetigungsMail({ referenz, betreff, objekt: objekt?.titel || objekt?.strasse || null }, branding)
    const m = await sendMail({
      typ: 'auftrag_eingang_bestaetigung',
      an: absender,
      anName: kontaktName,
      betreff: tpl.betreff,
      html: tpl.html,
      kundeId: org.id,
      leadId,
      replyTo: auftragsAdresseFuerOrg(org.org_kennung) ?? undefined,
    })
    if (!m.success) console.warn('[auftrag-per-mail] Bestätigung', m.error)
  } catch (e) {
    console.warn('[auftrag-per-mail] Bestätigung', e)
  }

  try {
    const { notifyInterneNeueMeldung } = await import('@/lib/org/org-mail-notify')
    await notifyInterneNeueMeldung(leadId)
  } catch (e) {
    console.warn('[auftrag-per-mail] Team-Hinweis', e)
  }
  return { ok: true, leadId }
}


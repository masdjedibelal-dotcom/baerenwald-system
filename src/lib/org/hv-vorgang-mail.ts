import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHtmlBase } from '@/lib/mail-templates'
import { mailTeamGruss } from '@/lib/mail/anrede'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { buildSubject } from '@/lib/mail/build-subject'
import { sendMail } from '@/lib/mail-service'
import { MARKE } from '@/lib/marke'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Wie lange eine andere Mail an die Verwaltung zum selben Vorgang diese Info überflüssig macht. */
const DOPPELT_FENSTER_MIN = 10

/**
 * Verwaltung (Auftraggeber) per E-Mail über einen Schritt im Vorgang informieren —
 * damit sie auch ohne Portal immer Bescheid weiß (Termin, Auftrag, Dokumentation, Abschluss …).
 *
 * - Nur bei Vorgängen mit Auftraggeber-Verwaltung und gültiger E-Mail.
 * - Keine Doppel-Mail: Ging in den letzten Minuten schon eine Mail zu diesem Vorgang an die
 *   Verwaltung (z. B. Angebot, Rechnung, Termin-Bestätigung), wird nichts gesendet.
 * - Versand über sendMail → BCC ans interne Postfach + E-Mail-Log.
 * Fail-soft: wirft nie.
 */
export async function informiereHvZumVorgang(input: {
  leadId: string
  /** Kurzes Ereignis für den Betreff, z. B. „Termin vor Ort“. */
  ereignis: string
  /** Ein bis zwei Sätze, was passiert ist. */
  text: string
  /** Optionale Zeilen (Label → Wert), z. B. Termin, Einheit. */
  zeilen?: Array<[string, string | null | undefined]>
  /** Optionaler Knopf, z. B. Protokoll als PDF öffnen. */
  knopf?: { label: string; url: string } | null
  auftragId?: string | null
}): Promise<{ gesendet: boolean; grund?: string }> {
  try {
    const leadId = input.leadId?.trim()
    if (!leadId) return { gesendet: false, grund: 'ohne_lead' }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('id, auftraggeber_kunde_id, kunde_objekt_id, melder_name, melder_einheit')
      .eq('id', leadId)
      .maybeSingle()
    if (error) logDbError('lib/org/hv-vorgang-mail:leads', error)
    const orgId = String(lead?.auftraggeber_kunde_id ?? '').trim()
    if (!orgId) return { gesendet: false, grund: 'keine_verwaltung' }

    const { data: org, error: orgErr } = await supabaseAdmin
      .from('kunden')
      .select('id, email, name, org_anzeigename, auth_user_id')
      .eq('id', orgId)
      .maybeSingle()
    if (orgErr) logDbError('lib/org/hv-vorgang-mail:kunden', orgErr)
    const an = String(org?.email ?? '').trim()
    if (!an || !EMAIL_RE.test(an)) return { gesendet: false, grund: 'keine_email' }

    const seit = new Date(Date.now() - DOPPELT_FENSTER_MIN * 60 * 1000).toISOString()
    const { data: kuerzlich, error: logErr } = await supabaseAdmin
      .from('email_log')
      .select('id')
      .eq('lead_id', leadId)
      .ilike('an_email', `%${an}%`)
      .eq('status', 'gesendet')
      .gte('created_at', seit)
      .limit(1)
    if (logErr) logDbError('lib/org/hv-vorgang-mail:email_log', logErr)
    if (kuerzlich?.length) return { gesendet: false, grund: 'schon_informiert' }

    let objektTitel = ''
    if (lead?.kunde_objekt_id) {
      const { data: obj, error: objErr } = await supabaseAdmin
        .from('kunden_objekte')
        .select('titel')
        .eq('id', lead.kunde_objekt_id)
        .maybeSingle()
      if (objErr) logDbError('lib/org/hv-vorgang-mail:kunden_objekte', objErr)
      objektTitel = String(obj?.titel ?? '').trim()
    }

    // Portal-Hinweis nur, wenn die Verwaltung überhaupt ein Login hat (sonst nie registriert)
    let hatLogin = Boolean(String((org as { auth_user_id?: string | null } | null)?.auth_user_id ?? '').trim())
    if (!hatLogin) {
      const { data: mit, error: mitErr } = await supabaseAdmin
        .from('kunden_mitglieder')
        .select('auth_user_id')
        .eq('kunde_id', orgId)
        .eq('aktiv', true)
        .not('auth_user_id', 'is', null)
        .limit(1)
      if (mitErr) logDbError('lib/org/hv-vorgang-mail:kunden_mitglieder', mitErr)
      hatLogin = Boolean(mit?.length)
    }

    const b = await getMailBranding()
    const firma = b.firmenname.trim() || MARKE.name
    const einheit = String(lead?.melder_einheit ?? '').trim()
    const melder = String(lead?.melder_name ?? '').trim()
    const alle: Array<[string, string]> = [
      ['Objekt', objektTitel],
      ['Mieter', [melder, einheit ? `WE ${einheit}` : ''].filter(Boolean).join(' · ')],
      ...(input.zeilen ?? []).map(([k, v]): [string, string] => [k, String(v ?? '').trim()]),
    ]
    const zeilen = alle.filter(([, v]) => v)

    const tabelle = zeilen.length
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">${zeilen
          .map(
            ([k, v]) =>
              `<tr><td style="padding:3px 16px 3px 0;font-size:14px;color:${C.gray500};vertical-align:top;">${esc(k)}</td><td style="padding:3px 0;font-size:14px;color:${C.gray700};">${esc(v)}</td></tr>`
          )
          .join('')}</table>`
      : ''

    const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${esc(input.text.trim())}</p>
    ${tabelle}
    ${input.knopf?.url ? `<p style="margin:0 0 16px;">${mailPrimaryButtonHtml(input.knopf.label, input.knopf.url)}</p>` : ''}
    <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${mailTeamGruss('sie', firma)}</p>
  `
    const betreff = buildSubject({ objekt: objektTitel || null, ereignis: input.ereignis })
    const html = mailHtmlBase(body, input.ereignis, b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: buildPortalLoginLink(),
      skipMeinBaerenwaldPs: !hatLogin,
    })

    const r = await sendMail({
      typ: 'update_hinweis',
      an,
      anName: String(org?.org_anzeigename ?? org?.name ?? '').trim() || null,
      betreff,
      html,
      kundeId: orgId,
      leadId,
      auftragId: input.auftragId ?? null,
      kontextTyp: input.auftragId ? 'auftrag' : 'anfrage',
    })
    if (!r.success) {
      console.warn('[informiereHvZumVorgang] Versand:', r.error)
      return { gesendet: false, grund: 'fehler' }
    }
    return { gesendet: true }
  } catch (e) {
    console.warn('[informiereHvZumVorgang]', e)
    return { gesendet: false, grund: 'fehler' }
  }
}

function datumDe(d: string | null | undefined): string {
  const t = String(d ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.split('-').reverse().join('.') : ''
}

/** Ausführungstermin eines Einsatzes (CRM oder Handwerker) → Verwaltung informieren. */
export async function informiereHvAusfuehrungstermin(input: {
  einsatzId: string
  geaendert?: boolean
}): Promise<void> {
  try {
    const { data: e, error } = await supabaseAdmin
      .from('einsaetze')
      .select('auftrag_id, termin_von, termin_bis')
      .eq('id', input.einsatzId)
      .maybeSingle()
    if (error) logDbError('lib/org/hv-vorgang-mail:einsaetze', error)
    if (!e?.termin_von || !e.auftrag_id) return
    const { data: a, error: aErr } = await supabaseAdmin
      .from('auftraege')
      .select('id, lead_id, titel')
      .eq('id', e.auftrag_id)
      .maybeSingle()
    if (aErr) logDbError('lib/org/hv-vorgang-mail:auftraege', aErr)
    if (!a?.lead_id) return
    const von = datumDe(e.termin_von)
    const bis = e.termin_bis && e.termin_bis !== e.termin_von ? datumDe(e.termin_bis) : ''
    const titel = String(a.titel ?? '').trim() || 'Auftrag'
    await informiereHvZumVorgang({
      leadId: String(a.lead_id),
      auftragId: String(a.id),
      ereignis: input.geaendert ? 'Termin geändert' : 'Termin vereinbart',
      text: input.geaendert
        ? `Der Ausführungstermin zum Auftrag „${titel}“ hat sich geändert.`
        : `Für den Auftrag „${titel}“ steht der Ausführungstermin fest.`,
      zeilen: [['Termin', bis ? `${von} bis ${bis}` : von]],
    })
  } catch (err) {
    console.warn('[informiereHvAusfuehrungstermin]', err)
  }
}

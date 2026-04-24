'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/mail-branding'
import {
  mailAnfrageBestaetigung,
  mailBesichtigungTermin,
  mailUpdateHinweis,
  mailZahlungserinnerung,
} from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { ensureKundenTokenForAuftrag, projektUrlFromToken } from '@/lib/projekt/kunden-token'

/** Website-Lead: Bestätigungsmail; mit `force` auch für manuell erfasste Anfragen (Checkbox). */
export async function sendAnfrageBestaetigung(
  leadId: string,
  force = false
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, kanal, kontakt_email, kontakt_name, bereiche, kunde_id, kunden(name)')
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

  const statusLink = await projektOderStatusLink(leadId)

  const bereiche = (lead as { bereiche?: string[] | null }).bereiche ?? null
  const tpl = mailAnfrageBestaetigung({ name, bereiche, statusLink }, branding)
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

function formatUhrzeitKurz(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  const s = raw.trim()
  return s.length >= 5 ? s.slice(0, 5) : s
}

/** E-Mail an Kund:in nach Besichtigung / Termin aus dem CRM (Resend). */
export async function sendBesichtigungTerminBestaetigung(input: {
  leadId: string
  to: string
  name: string
  terminTitel: string
  datum: string
  uhrzeitVon: string | null
  uhrzeitBis: string | null
  adresse: string | null
  notiz: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = input.to.trim()
  if (!email) return { ok: false, message: 'Keine E-Mail-Adresse.' }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id')
    .eq('id', input.leadId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!lead) return { ok: false, message: 'Lead nicht gefunden oder keine Berechtigung.' }

  const branding = await getMailBranding(supabaseAdmin)
  const statusLink = await projektOderStatusLink(input.leadId)
  const d = input.datum.trim().slice(0, 10)
  const datumFmt = formatDeDate(d)
  const v = formatUhrzeitKurz(input.uhrzeitVon)
  const b = formatUhrzeitKurz(input.uhrzeitBis)
  let zeitText = ''
  if (v && b) zeitText = `${v} – ${b} Uhr`
  else if (v) zeitText = `${v} Uhr`
  else if (b) zeitText = `bis ${b} Uhr`

  const tpl = mailBesichtigungTermin(
    {
      name: input.name.trim() || 'Kundin/Kunde',
      terminTitel: input.terminTitel.trim() || 'Termin',
      datumFmt,
      zeitText,
      adresse: (input.adresse ?? '').trim(),
      notiz: (input.notiz ?? '').trim(),
      statusLink,
    },
    branding
  )

  const r = await sendMail({
    typ: 'besichtigung_termin',
    an: email,
    anName: input.name.trim() || null,
    betreff: tpl.betreff,
    html: tpl.html,
    leadId: input.leadId,
    kundeId: (lead as { kunde_id?: string | null }).kunde_id ?? null,
    from: process.env.RESEND_FROM_ANFRAGEN ?? process.env.RESEND_FROM_EMAIL,
  })

  if (!r.success) {
    const hint =
      r.error === 'RESEND_API_KEY fehlt'
        ? 'RESEND_API_KEY fehlt in .env.local — bitte Resend-API-Key eintragen.'
        : (r.error ?? 'Versand fehlgeschlagen')
    return { ok: false, message: hint }
  }
  return { ok: true }
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
      'id, rechnungsnummer, brutto, faellig_am, erinnerung_7_sent_at, erinnerung_21_sent_at, intern_warnung_30_at, kunde_id, kunden(name, email)'
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
    const brutto = r.brutto ?? 0
    const faelligFmt = formatDeDate(r.faellig_am)

    try {
      if (tage >= 7 && !r.erinnerung_7_sent_at && email) {
        const tpl = mailZahlungserinnerung(
          {
            name,
            nummer: r.rechnungsnummer,
            brutto,
            faelligAm: faelligFmt,
            tageUeberfaellig: tage,
            iban,
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
            .update({ erinnerung_7_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', r.id)
          ergebnis.push({ id: r.id, aktion: 'erinnerung_7' })
        }
      }

      if (tage >= 21 && !r.erinnerung_21_sent_at && email) {
        const tpl = mailZahlungserinnerung(
          {
            name,
            nummer: r.rechnungsnummer,
            brutto,
            faelligAm: faelligFmt,
            tageUeberfaellig: tage,
            iban,
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
            .update({ erinnerung_21_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
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
    .select('kunden_token, kunden(name, email)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error || !auf) return null
  let token = (auf as { kunden_token?: string | null }).kunden_token?.trim()
  if (!token) {
    const t = await ensureKundenTokenForAuftrag(auftragId)
    token = t ?? undefined
  }
  if (!token) return null
  const k = (auf as { kunden?: { name?: string; email?: string | null } | null }).kunden
  const name = String(k?.name ?? 'Kundin/Kunde').trim()
  const an = String(k?.email ?? '').trim()
  if (!an) return null
  const url = projektUrlFromToken(token)
  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailUpdateHinweis({ name, statusLink: url }, branding)
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

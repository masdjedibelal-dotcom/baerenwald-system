import { Resend } from 'resend'
import type { AngebotPosition, Kunde, Lead } from '@/lib/types'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const fromDefault =
  process.env.RESEND_FROM_EMAIL ?? 'Bärenwald <onboarding@resend.dev>'

/** Absender für Angebots- / Handwerker-Anfragen (Domain bei Resend verifizieren) */
export const RESEND_FROM_ANFRAGEN =
  process.env.RESEND_FROM_ANFRAGEN ?? 'Bärenwald München <anfragen@baerenwaldmuenchen.de>'

/** Einfache HTML-Mail (Auftragsbestätigung, Infos) — gleicher Absender wie Anfragen */
export async function sendTransactionalHtmlEmail(input: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  return sendHandwerkerAngebotEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    from: input.from,
  })
}

export async function sendHandwerkerAngebotEmail(input: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  const resend = getResend()
  if (!resend) {
    return { ok: false as const, message: 'RESEND_API_KEY fehlt' }
  }
  const { error } = await resend.emails.send({
    from: input.from ?? RESEND_FROM_ANFRAGEN,
    to: input.to,
    subject: input.subject,
    html: input.html,
  })
  if (error) return { ok: false as const, message: error.message }
  return { ok: true as const }
}

export async function sendKundenAngebotEmail(input: {
  to: string
  subject: string
  html: string
  pdfBuffer: Buffer
  pdfFilename: string
  from?: string
}) {
  const resend = getResend()
  if (!resend) {
    return { ok: false as const, message: 'RESEND_API_KEY fehlt' }
  }
  const { error } = await resend.emails.send({
    from: input.from ?? RESEND_FROM_ANFRAGEN,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.pdfFilename,
        content: input.pdfBuffer,
      },
    ],
  })
  if (error) return { ok: false as const, message: error.message }
  return { ok: true as const }
}

/** Interne Benachrichtigung (INTERN_EMAIL); ohne Empfänger no-op */
export async function sendInternNotifyEmail(input: { subject: string; html: string }) {
  const to = process.env.INTERN_EMAIL?.trim()
  if (!to) return { ok: true as const }
  const resend = getResend()
  if (!resend) return { ok: false as const, message: 'RESEND_API_KEY fehlt' }
  const { error } = await resend.emails.send({
    from: fromDefault,
    to,
    subject: input.subject,
    html: input.html,
  })
  if (error) return { ok: false as const, message: error.message }
  return { ok: true as const }
}

export function buildHandwerkerEmailHtml(input: {
  kunde: Kunde
  lead: Lead | null
  positionen: AngebotPosition[]
}) {
  const zeitraum = input.lead?.zeitraum ?? '—'
  const plz = input.kunde.plz ?? input.lead?.plz ?? '—'
  const adresse = input.kunde.adresse ?? '—'
  const lines = input.positionen
    .map((p) => {
      const txt = (p.beschreibung || p.leistung).trim()
      return `<li><strong>${p.gewerk_name}</strong>: ${txt} (${p.menge} ${p.einheit})</li>`
    })
    .join('')
  const intern = process.env.INTERN_EMAIL ?? ''
  return `
  <p>Neue Anfrage für Ihr Gewerk.</p>
  <p><strong>Kunde:</strong> ${input.kunde.name}<br/>
  <strong>Adresse:</strong> ${adresse}<br/>
  <strong>PLZ:</strong> ${plz}<br/>
  <strong>Gewünschter Zeitraum:</strong> ${zeitraum}</p>
  <p><strong>Leistungen:</strong></p>
  <ul>${lines}</ul>
  <p>Bitte melden Sie sich zur Terminabsprache.</p>
  ${intern ? `<p>Kontakt Bärenwald: ${intern}</p>` : ''}
  `
}

export function buildKundenAngebotEmailHtml(input: {
  kunde: Kunde
  gesamtMin: number
  gesamtMax: number
  gueltigBis: string
}) {
  const preis = `${input.gesamtMin.toLocaleString('de-DE')} – ${input.gesamtMax.toLocaleString('de-DE')} €`
  const tel = process.env.INTERN_EMAIL ?? ''
  return `
  <p>Sehr geehrte Damen und Herren,</p>
  <p>anbei finden Sie Ihr Angebot von Bärenwald München.</p>
  <p><strong>Gesamtpreis-Range:</strong> ${preis}<br/>
  <strong>Gültig bis:</strong> ${input.gueltigBis}</p>
  <p>Bei Fragen erreichen Sie uns unter ${tel || 'unserer bekannten Kontaktnummer'}.</p>
  <p><a href="mailto:${tel}">Angebot annehmen (Rückmeldung per E-Mail)</a></p>
  `
}

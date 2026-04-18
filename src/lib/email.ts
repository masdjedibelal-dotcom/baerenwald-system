import { Resend } from 'resend'
import type {
  AngebotKundePosition,
  EmailBranding,
  HandwerkerAnfragePosition,
  NachtragMailPosition,
} from '@/lib/email-templates'
import * as templates from '@/lib/email-templates'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM_DEFAULT =
  process.env.RESEND_FROM_EMAIL ?? 'Bärenwald München <anfragen@baerenwaldmuenchen.de>'

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  from,
}: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
  from?: string
}) {
  const resend = getResend()
  if (!resend) {
    const err = new Error('RESEND_API_KEY fehlt')
    console.error('Email Error:', err.message)
    throw err
  }
  const { data, error } = await resend.emails.send({
    from: from ?? FROM_DEFAULT,
    to,
    subject,
    html,
    attachments,
  })
  if (error) {
    console.error('Email Error:', error)
    throw error
  }
  return data
}

export const emails = {
  leadBestaetigung: async (to: string, data: Parameters<typeof templates.emailLeadBestaetigung>[0], branding?: EmailBranding) =>
    sendEmail({
      to,
      subject: 'Ihre Anfrage ist eingegangen — Bärenwald',
      html: templates.emailLeadBestaetigung(data, branding),
    }),

  angebotKunde: async (
    to: string,
    data: {
      name: string
      positionen: AngebotKundePosition[]
      gesamt_min: number
      gesamt_max: number
      gueltig_bis: string
      lohn_gesamt?: number
    },
    pdfBuffer: Buffer,
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: 'Ihr Angebot — Bärenwald München',
      html: templates.emailAngebotKunde(data, branding),
      attachments: [{ filename: 'Angebot-Baerenwaldmuenchen.pdf', content: pdfBuffer }],
    }),

  auftragsbestaetigung: async (to: string, data: Parameters<typeof templates.emailAuftragsbestaetigung>[0], branding?: EmailBranding) =>
    sendEmail({
      to,
      subject: 'Auftragsbestätigung — Bärenwald München',
      html: templates.emailAuftragsbestaetigung(data, branding),
    }),

  updateHinweis: async (
    to: string,
    data: { name: string; link: string },
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: 'Update zu Ihrem Projekt — Bärenwald München',
      html: templates.emailUpdateHinweis(data, branding),
    }),

  internHinweis: async (to: string, text: string, branding?: EmailBranding) =>
    sendEmail({
      to,
      subject: '[Intern] Bärenwald CRM',
      html: templates.emailInternHinweis(text, branding),
    }),

  abnahme: async (
    to: string,
    data: Parameters<typeof templates.emailAbnahme>[0],
    protokollBuffer: Buffer,
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: 'Abnahmeprotokoll — Bärenwald München',
      html: templates.emailAbnahme(data, branding),
      attachments: [{ filename: 'Abnahmeprotokoll-Baerenwaldmuenchen.pdf', content: protokollBuffer }],
    }),

  rechnung: async (
    to: string,
    data: Parameters<typeof templates.emailRechnung>[0],
    rechnungBuffer: Buffer,
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: `Rechnung ${data.rechnungsnummer} — Bärenwald München`,
      html: templates.emailRechnung(data, branding),
      attachments: [{ filename: `Rechnung-${data.rechnungsnummer}.pdf`, content: rechnungBuffer }],
    }),

  zahlungserinnerung: async (
    to: string,
    data: Parameters<typeof templates.emailZahlungserinnerung>[0],
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: `Zahlungserinnerung ${data.rechnungsnummer} — Bärenwald München`,
      html: templates.emailZahlungserinnerung(data, branding),
    }),

  handwerkerAnfrage: async (
    to: string,
    data: {
      name: string
      gewerk: string
      plz: string
      zeitraum?: string
      positionen: HandwerkerAnfragePosition[]
      link: string
    },
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: `Neue Anfrage: ${data.gewerk} — Bärenwald`,
      html: templates.emailHandwerkerAnfrage(data, branding),
    }),

  bewertung: async (to: string, data: Parameters<typeof templates.emailBewertung>[0], branding?: EmailBranding) =>
    sendEmail({
      to,
      subject: 'Wie war Ihre Erfahrung? — Bärenwald',
      html: templates.emailBewertung(data, branding),
    }),

  nachtragKunde: async (
    to: string,
    data: {
      name: string
      grund: string
      positionen: NachtragMailPosition[]
      gesamt_min: number
      gesamt_max: number
      link: string
      erinnerung?: boolean
    },
    branding?: EmailBranding
  ) =>
    sendEmail({
      to,
      subject: data.erinnerung
        ? 'Erinnerung: Nachtrag zu Ihrem Auftrag — Bärenwald München'
        : 'Nachtrag zu Ihrem Auftrag — Bärenwald München',
      html: templates.emailNachtrag(data, branding),
    }),
}

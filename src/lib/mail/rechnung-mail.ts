import type { MailBranding } from '@/lib/mail-branding'
import { mailBetragPriceHtml } from '@/lib/mail/betrag-label'
import {
  mailHtmlBase,
  mailKundenContactLine,
  mailKundenGruss,
  mailKundenStandardOptions,
  mailSummaryBlock,
} from '@/lib/mail-templates'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEur(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type RechnungMailInput = {
  anrede: AngebotMailAnrede
  begruessung: string
  rechnungsnummer: string
  brutto: number
  faelligAm: string
  /** z. B. Leistungsumfang aus Angebot — sonst nur Rechnungsnummer in der Box */
  projektTitel?: string | null
  mailEinleitung?: string | null
  mailBetreff?: string | null
  /** Reverse Charge (§13b) — Betrag netto, kein „inkl. MwSt.“ */
  reverseCharge?: boolean
  /** Korrektur-Versand (Betreff / Defaults), auch ohne Storno-PDF */
  istKorrektur?: boolean
  /** Storno-Gutschrift + neue RE in einer Mail */
  mitStornoAnhang?: boolean
  /** GS-Nummer für klarere Mail (z. B. GS-RE2026-2072) */
  stornoGutschriftNummer?: string | null
  /** Ursprungs-RE, die storniert wird (z. B. RE2026-2088) */
  stornoBezugRechnungsnummer?: string | null
  /** Abschlussbericht als zusätzlicher PDF-Anhang */
  mitAbschlussberichtAnhang?: boolean
}

export function rechnungMailBetreff(
  anrede: AngebotMailAnrede,
  rechnungsnummer: string,
  firmenname: string
): string {
  const nr = sanitizeRechnungNrFuerBetreff(rechnungsnummer)
  return anrede === 'du'
    ? `Deine Rechnung ${nr} · ${firmenname}`
    : `Ihre Rechnung ${nr} · ${firmenname}`
}

/** Betreff bei Korrektur (Storno-Gutschrift + neue RE). */
export function rechnungKorrekturMailBetreff(
  rechnungsnummer: string,
  firmenname: string,
  opts?: { originalNr?: string | null }
): string {
  const neu = sanitizeRechnungNrFuerBetreff(rechnungsnummer)
  const orig = opts?.originalNr?.trim()
    ? sanitizeRechnungNrFuerBetreff(opts.originalNr)
    : null
  if (orig && orig !== neu) {
    return `Korrektur ${orig} → ${neu} · ${firmenname}`
  }
  return `Korrektur ${neu} · ${firmenname}`
}

/** Kein „Entwurf“ im Kunden-Betreff (auch bei Platzhalter ohne echte Nummer). */
export function sanitizeRechnungNrFuerBetreff(raw: string): string {
  const s = raw.trim()
  if (!s) return 'Rechnung'
  const cleaned = s
    .replace(/\bRE-Entwurf\b/gi, 'Rechnung')
    .replace(/\bEntwurf\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*·\s*·/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .trim()
  return cleaned || 'Rechnung'
}

export function sanitizeRechnungMailBetreff(betreff: string): string {
  return betreff
    .replace(/\bRE-Entwurf\b/gi, 'Rechnung')
    .replace(/\bEntwurf\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*·\s*·/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .trim()
}

/** Standard-Einleitungstext in der Kunden-Mail (nicht PDF). */
export function defaultRechnungMailEinleitung(anrede: AngebotMailAnrede = 'sie'): string {
  return anrede === 'du'
    ? 'anbei findest du deine Rechnung als PDF — kurz zur Übersicht:'
    : 'anbei erhalten Sie Ihre Rechnung als PDF — kurz zur Übersicht:'
}

/** Standard-Einleitung bei Korrektur ohne Storno (nur neue/korrigierte RE im Anhang). */
export function defaultRechnungKorrekturMailEinleitung(
  anrede: AngebotMailAnrede = 'sie',
  opts?: {
    originalNr?: string | null
    neueNr?: string | null
  }
): string {
  const orig = opts?.originalNr?.trim() || null
  const neu = opts?.neueNr?.trim() || null
  if (anrede === 'du') {
    if (orig && neu && orig !== neu) {
      return `wir korrigieren die Rechnung ${orig} — im Anhang findest du die korrigierte Rechnung ${neu}.`
    }
    if (orig) {
      return `wir korrigieren die Rechnung ${orig} — im Anhang findest du die korrigierte Rechnung.`
    }
    return 'wir korrigieren eine zuvor gestellte Rechnung — im Anhang findest du die korrigierte Rechnung.'
  }
  if (orig && neu && orig !== neu) {
    return `wir korrigieren die Rechnung ${orig} — im Anhang finden Sie die korrigierte Rechnung ${neu}.`
  }
  if (orig) {
    return `wir korrigieren die Rechnung ${orig} — im Anhang finden Sie die korrigierte Rechnung.`
  }
  return 'wir korrigieren eine zuvor gestellte Rechnung — im Anhang finden Sie die korrigierte Rechnung.'
}

/** Standard-Einleitung bei Korrektur mit Storno-Gutschrift + neuer RE (zwei PDFs). */
export function defaultRechnungKorrekturMitStornoMailEinleitung(
  anrede: AngebotMailAnrede = 'sie',
  opts?: {
    originalNr?: string | null
    gutschriftNr?: string | null
    neueNr?: string | null
  }
): string {
  const orig = opts?.originalNr?.trim() || null
  const gs = opts?.gutschriftNr?.trim() || null
  const neu = opts?.neueNr?.trim() || null
  if (anrede === 'du') {
    if (orig && gs && neu) {
      return `wir korrigieren die Rechnung ${orig}: Im Anhang findest du die Storno-Gutschrift ${gs} und die neue Rechnung ${neu}.`
    }
    if (orig) {
      return `wir korrigieren die Rechnung ${orig} — im Anhang findest du die Storno-Gutschrift und die neue Rechnung.`
    }
    return 'wir korrigieren eine zuvor gestellte Rechnung — im Anhang findest du die Storno-Gutschrift und die neue Rechnung.'
  }
  if (orig && gs && neu) {
    return `wir korrigieren die Rechnung ${orig}: Im Anhang finden Sie die Storno-Gutschrift ${gs} und die neue Rechnung ${neu}.`
  }
  if (orig) {
    return `wir korrigieren die Rechnung ${orig} — im Anhang finden Sie die Storno-Gutschrift und die neue Rechnung.`
  }
  return 'wir korrigieren eine zuvor gestellte Rechnung — im Anhang finden Sie die Storno-Gutschrift und die neue Rechnung.'
}

export function buildRechnungMail(
  data: RechnungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const anrede = data.anrede
  const begr = esc(data.begruessung.trim() || (anrede === 'du' ? 'Hallo,' : 'Guten Tag,'))
  const nr = esc(data.rechnungsnummer)
  const faellig = esc(data.faelligAm)
  const titel = esc(data.projektTitel?.trim() || data.rechnungsnummer)
  const mitStorno = Boolean(data.mitStornoAnhang)
  const istKorrektur = Boolean(data.istKorrektur || mitStorno)

  const introRaw =
    data.mailEinleitung?.trim() ||
    (mitStorno
      ? defaultRechnungKorrekturMitStornoMailEinleitung(anrede, {
          originalNr: data.stornoBezugRechnungsnummer,
          gutschriftNr: data.stornoGutschriftNummer,
          neueNr: data.rechnungsnummer,
        })
      : istKorrektur
        ? defaultRechnungKorrekturMailEinleitung(anrede, {
            originalNr: data.stornoBezugRechnungsnummer,
            neueNr: data.rechnungsnummer,
          })
        : defaultRechnungMailEinleitung(anrede))
  const intro = esc(introRaw)

  const pdfHinweis = data.mitAbschlussberichtAnhang
    ? anrede === 'du'
      ? 'Im Anhang: Rechnung und Abschlussbericht als PDF.'
      : 'Im Anhang: Rechnung und Abschlussbericht als PDF.'
    : mitStorno
      ? anrede === 'du'
        ? data.stornoGutschriftNummer
          ? `Zwei PDFs im Anhang: Storno-Gutschrift ${data.stornoGutschriftNummer} und Rechnung ${data.rechnungsnummer}.`
          : 'Zwei PDFs im Anhang: Storno-Gutschrift und neue Rechnung.'
        : data.stornoGutschriftNummer
          ? `Zwei PDFs im Anhang: Storno-Gutschrift ${data.stornoGutschriftNummer} und Rechnung ${data.rechnungsnummer}.`
          : 'Zwei PDFs im Anhang: Storno-Gutschrift und neue Rechnung.'
      : anrede === 'du'
        ? 'Alle Positionen, Zahlungsdaten und den Verwendungszweck findest du im PDF-Anhang.'
        : 'Alle Positionen, Zahlungsdaten und den Verwendungszweck finden Sie im PDF-Anhang.'

  const summaryLabel = istKorrektur
    ? data.stornoBezugRechnungsnummer
      ? `KORREKTUR · ${data.stornoBezugRechnungsnummer} → ${nr}`
      : `KORREKTUR · ${nr}`
    : anrede === 'du'
      ? `DEINE RECHNUNG · ${nr}`
      : `IHRE RECHNUNG · ${nr}`

  const summaryHtml = mailSummaryBlock({
    label: summaryLabel,
    title: titel,
    priceHtml: mailBetragPriceHtml(data.brutto, { reverseCharge: data.reverseCharge }),
    metaHtml: `<p style="font-size:15px;color:#374151;margin:8px 0 0;"><strong>Fällig am:</strong> ${faellig}</p>`,
  })

  const contact = mailKundenContactLine(anrede, b.telefon)
  const gruss = mailKundenGruss(anrede)

  const disclaimer =
    anrede === 'du'
      ? 'Du erhältst diese Mail, weil wir dir eine Rechnung zugesendet haben.'
      : 'Sie erhalten diese Mail, weil wir Ihnen eine Rechnung zugesendet haben.'

  const preheader = `${data.rechnungsnummer} · ${formatEur(data.brutto)} € · fällig ${data.faelligAm}`

  const html = mailHtmlBase(
    `<p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${begr}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${intro}</p>
      ${summaryHtml}
      <p style="font-size:15px;color:#374151;margin:0 0 12px;line-height:1.6;">${pdfHinweis}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">${contact}</p>
      <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">${gruss}</p>`,
    preheader,
    b,
    disclaimer,
    mailKundenStandardOptions(anrede)
  )

  const betreff = sanitizeRechnungMailBetreff(
    data.mailBetreff?.trim() ||
      (istKorrektur
        ? rechnungKorrekturMailBetreff(data.rechnungsnummer, b.firmenname, {
            originalNr: data.stornoBezugRechnungsnummer,
          })
        : rechnungMailBetreff(anrede, data.rechnungsnummer, b.firmenname))
  )

  return { betreff, html }
}

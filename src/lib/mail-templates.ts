import type { MailBranding } from '@/lib/mail-branding'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function base(content: string, preheader: string, b: MailBranding): string {
  const tel = esc(b.telefon)
  const addr = esc(b.adresseZeile)
  const pre = preheader ? esc(preheader) : ''
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
${pre ? `<div style="display:none;max-height:0;overflow:hidden;">${pre}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
<tr><td style="background:#1A3D2B;padding:20px 32px;">
<span style="color:#fff;font-size:18px;font-weight:600;">${esc(b.firmenname)}</span>
</td></tr>
<tr><td style="padding:32px;">
${content}
</td></tr>
<tr><td style="background:#F7F6F3;padding:16px 32px;font-size:12px;color:#6B7280;border-top:1px solid #E2E8E2;">
${esc(b.firmenname)}<br/>
${addr} · <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function btn(text: string, url: string): string {
  return `<a href="${esc(url)}" style="display:inline-block;background:#2E7D52;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0;">${esc(text)}</a>`
}

function greenBox(html: string): string {
  return `<div style="background:#EAF3DE;border-radius:8px;padding:16px 20px;margin:16px 0;">${html}</div>`
}

/** Bestätigung Besichtigung / Kalender-Termin an Kund:in */
export function mailBesichtigungTermin(
  data: {
    name: string
    terminTitel: string
    datumFmt: string
    zeitText: string
    adresse: string
    notiz: string
    statusLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const tt = esc(data.terminTitel)
  const zeitBlock =
    data.zeitText.trim().length > 0
      ? `<p style="margin:8px 0 0;"><strong>Uhrzeit:</strong> ${esc(data.zeitText)}</p>`
      : ''
  const adresseBlock =
    data.adresse.trim().length > 0
      ? `<p style="margin:8px 0 0;"><strong>Ort / Adresse:</strong> ${esc(data.adresse)}</p>`
      : ''
  const notizBlock =
    data.notiz.trim().length > 0
      ? `<p style="margin:20px 0 0;font-size:14px;line-height:1.5;">${esc(data.notiz).replace(/\n/g, '<br/>')}</p>`
      : ''
  const tel = esc(b.telefon)
  return {
    betreff: `Terminbestätigung: ${data.terminTitel} — ${b.firmenname}`,
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihr Termin</h2>
      <p>Guten Tag ${name},</p>
      <p>wir bestätigen folgenden Termin:</p>
      ${greenBox(`
        <p style="margin:0;font-size:16px;font-weight:600;color:#1A3D2B;">${tt}</p>
        <p style="margin:8px 0 0;"><strong>Datum:</strong> ${esc(data.datumFmt)}</p>
        ${zeitBlock}
        ${adresseBlock}
      `)}
      ${notizBlock}
      <p style="margin:24px 0 0;">${btn('Projektstatus ansehen →', data.statusLink)}</p>
      <p style="margin:16px 0 0;font-size:14px;">Bei Rückfragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Termin am ${data.datumFmt}`,
      b
    ),
  }
}

export function mailAnfrageBestaetigung(
  data: { name: string; bereiche?: string[] | null; statusLink: string },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  return {
    betreff: 'Ihre Anfrage ist eingegangen — Bärenwald München',
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihre Anfrage ist eingegangen</h2>
      <p>Guten Tag ${name},</p>
      <p>vielen Dank für Ihre Anfrage. Wir melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen.</p>
      ${greenBox(`
        <p style="margin:0;font-size:13px;color:#2E7D52;">Ihr persönlicher Projekt-Link</p>
        <p style="margin:8px 0 0;font-size:13px;color:#1A3D2B;">Über diesen Link können Sie jederzeit den Status Ihrer Anfrage verfolgen.</p>
        ${btn('Projekt verfolgen →', data.statusLink)}
        <p style="margin:8px 0 0;font-size:12px;color:#6B9E80;">Bitte speichern Sie diesen Link — kein Passwort nötig.</p>
      `)}
    `,
      'Wir haben Ihre Anfrage erhalten',
      b
    ),
  }
}

type PosRow = {
  beschreibung?: string | null
  leistung?: string | null
  gesamt_fix?: number | null
  gesamt_min?: number | null
  gesamt_max?: number | null
}

export function mailAngebot(
  data: {
    name: string
    positionen: PosRow[]
    gesamt_min: number
    gesamt_max: number
    lohn_gesamt: number
    gueltig_bis: string
    statusLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const istRange = data.gesamt_min !== data.gesamt_max
  const betragText = istRange
    ? `${data.gesamt_min.toLocaleString('de-DE')} – ${data.gesamt_max.toLocaleString('de-DE')} €`
    : `${data.gesamt_min.toLocaleString('de-DE')} €`
  const tel = esc(b.telefon)
  const rows = data.positionen
    .map((p) => {
      const txt = esc(String(p.beschreibung || p.leistung || 'Position').trim())
      const g = Number(p.gesamt_fix ?? p.gesamt_min ?? p.gesamt_max ?? 0)
      return `<tr style="border-bottom:1px solid #E2E8E2;">
        <td style="padding:8px 0;">${txt}</td>
        <td style="padding:8px 0;text-align:right;white-space:nowrap;color:#2E7D52;font-weight:500;">${g.toLocaleString('de-DE')} €</td>
      </tr>`
    })
    .join('')
  const steuer = Math.round(data.lohn_gesamt * 0.2)
  return {
    betreff: 'Ihr Angebot von Bärenwald München',
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihr persönliches Angebot</h2>
      <p>Guten Tag ${name},</p>
      <p>anbei finden Sie Ihr Angebot. Das detaillierte Dokument finden Sie im Anhang.</p>
      ${greenBox(`
        <p style="margin:0;font-size:12px;color:#2E7D52;">Gesamtbetrag inkl. MwSt.</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#1A3D2B;">${esc(betragText)}</p>
      `)}
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">${rows}</table>
      <p style="font-size:13px;color:#6B7280;">💡 Als Privatperson können Sie den Lohnkostenanteil von <strong>${data.lohn_gesamt.toLocaleString('de-DE')} €</strong> nach § 35a EStG steuerlich absetzen (20 % = ${steuer.toLocaleString('de-DE')} €).</p>
      <p style="font-size:13px;color:#6B7280;">Gültig bis: <strong>${esc(data.gueltig_bis)}</strong></p>
      ${btn('Projektstatus ansehen →', data.statusLink)}
      <p>Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Ihr Angebot: ${betragText}`,
      b
    ),
  }
}

export function mailAuftragsbestaetigung(
  data: {
    name: string
    gewerke: string[]
    startDatum: string
    endDatum?: string | null
    statusLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const gw = esc(data.gewerke.join(', '))
  const endRow = data.endDatum
    ? `<tr><td style="color:#2E7D52;padding:4px 0;">Voraussichtlich fertig:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${esc(data.endDatum)}</td></tr>`
    : ''
  return {
    betreff: 'Ihr Auftrag ist bestätigt — Bärenwald München',
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihr Auftrag ist bestätigt ✓</h2>
      <p>Guten Tag ${name},</p>
      <p>wir freuen uns, Ihren Auftrag zu bestätigen.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:40%;">Geplanter Start:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${esc(data.startDatum)}</td></tr>
        ${endRow}
        <tr><td style="color:#2E7D52;padding:4px 0;">Gewerke:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${gw}</td></tr>
        </table>
      `)}
      <p>Ein Ansprechpartner von Bärenwald koordiniert alle Arbeiten für Sie.</p>
      ${btn('Projektstatus verfolgen →', data.statusLink)}
      <p style="font-size:13px;color:#6B7280;">Über den Link können Sie jederzeit den aktuellen Stand Ihres Projekts sehen.</p>
    `,
      'Ihr Auftrag wurde bestätigt',
      b
    ),
  }
}

export function mailUpdateHinweis(data: { name: string; statusLink: string }, b: MailBranding): { betreff: string; html: string } {
  const name = esc(data.name)
  return {
    betreff: 'Neues Update zu Ihrem Projekt',
    html: base(
      `<p>Guten Tag ${name},</p><p>es gibt ein neues Update zu Ihrem Projekt.</p>${btn('Jetzt ansehen →', data.statusLink)}`,
      'Neues Update zu Ihrem Projekt',
      b
    ),
  }
}

export function mailNachtrag(
  data: {
    name: string
    grund: string
    positionen: PosRow[]
    gesamt_min: number
    gesamt_max: number
    bestaetigungsLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const betrag =
    data.gesamt_min === data.gesamt_max
      ? `${data.gesamt_min.toLocaleString('de-DE')} €`
      : `${data.gesamt_min.toLocaleString('de-DE')} – ${data.gesamt_max.toLocaleString('de-DE')} €`
  const tel = esc(b.telefon)
  const rows = data.positionen
    .map((p) => {
      const txt = esc(String(p.beschreibung || p.leistung || '').trim())
      const g = Number(p.gesamt_fix ?? p.gesamt_min ?? 0)
      return `<tr style="border-bottom:1px solid #E2E8E2;"><td style="padding:8px 0;">${txt}</td><td style="padding:8px 0;text-align:right;">${g.toLocaleString('de-DE')} €</td></tr>`
    })
    .join('')
  return {
    betreff: 'Nachtrag zu Ihrem Auftrag — Bärenwald München',
    html: base(
      `
      <h2 style="color:#C4922A;margin:0 0 16px;">Nachtrag zu Ihrem Auftrag</h2>
      <p>Guten Tag ${name},</p>
      <p>bei den laufenden Arbeiten ist ein Zusatzaufwand entstanden, den wir Ihnen transparent mitteilen.</p>
      <div style="background:#FEF3E3;border-radius:8px;padding:14px 16px;margin:16px 0;"><p style="margin:0;font-weight:600;">Grund: ${esc(data.grund)}</p></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">${rows}</table>
      ${greenBox(`
        <p style="margin:0;font-size:12px;color:#2E7D52;">Mehrkosten gesamt</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#1A3D2B;">+ ${esc(betrag)}</p>
      `)}
      ${btn('Nachtrag bestätigen →', data.bestaetigungsLink)}
      <p style="font-size:13px;color:#6B7280;">Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Nachtrag: +${betrag}`,
      b
    ),
  }
}

export function mailAbnahme(data: { name: string; gewerke: string[]; abnahmeDatum: string }, b: MailBranding): { betreff: string; html: string } {
  const name = esc(data.name)
  const gw = esc(data.gewerke.join(', '))
  const tel = esc(b.telefon)
  return {
    betreff: 'Ihr Projekt ist abgeschlossen — Bärenwald München',
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihr Projekt ist abgeschlossen ✓</h2>
      <p>Guten Tag ${name},</p>
      <p>alle Arbeiten wurden erfolgreich abgeschlossen und abgenommen.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:40%;">Abnahmedatum:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${esc(data.abnahmeDatum)}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Gewerke:</td><td style="font-weight:600;color:#1A3D2B;padding:4px 0;">${gw}</td></tr>
        </table>
      `)}
      <p>Das Abnahmeprotokoll mit der vollständigen Dokumentation finden Sie im Anhang.</p>
      <p style="font-size:13px;color:#6B7280;"><strong>Gewährleistung:</strong> Die gesetzliche Gewährleistung beträgt 5 Jahre ab Abnahme.</p>
      <p>Vielen Dank für Ihr Vertrauen!</p>
      <p><a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      'Ihr Projekt ist abgeschlossen',
      b
    ),
  }
}

export function mailRechnung(
  data: { name: string; nummer: string; brutto: number; faelligAm: string; iban: string },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const iban = data.iban || b.iban
  const tel = esc(b.telefon)
  return {
    betreff: `Rechnung ${data.nummer} — Bärenwald München`,
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Ihre Rechnung</h2>
      <p>Guten Tag ${name},</p>
      <p>anbei finden Sie Ihre Rechnung für die ausgeführten Arbeiten.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:50%;">Rechnungsnummer:</td><td style="font-weight:600;color:#1A3D2B;">${esc(data.nummer)}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Betrag:</td><td style="font-weight:700;font-size:18px;color:#1A3D2B;">${data.brutto.toLocaleString('de-DE')} €</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Fällig am:</td><td style="font-weight:600;color:#1A3D2B;">${esc(data.faelligAm)}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">IBAN:</td><td style="color:#1A3D2B;">${esc(iban)}</td></tr>
        </table>
      `)}
      <p style="font-size:13px;color:#6B7280;">Verwendungszweck: <strong>${esc(data.nummer)}</strong></p>
      <p style="font-size:13px;color:#6B7280;">Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Rechnung ${data.nummer}`,
      b
    ),
  }
}

export function mailZahlungserinnerung(
  data: {
    name: string
    nummer: string
    brutto: number
    faelligAm: string
    tageUeberfaellig: number
    iban: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const iban = data.iban || b.iban
  const tel = esc(b.telefon)
  return {
    betreff: `Zahlungserinnerung ${data.nummer}`,
    html: base(
      `
      <h2 style="color:#C4922A;margin:0 0 16px;">Zahlungserinnerung</h2>
      <p>Guten Tag ${name},</p>
      <p>unsere Rechnung <strong>${esc(data.nummer)}</strong> ist seit <strong>${data.tageUeberfaellig} Tagen</strong> offen.</p>
      <div style="background:#FEF3E3;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;">
        <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:#C4922A;padding:4px 0;width:50%;">Offener Betrag:</td><td style="font-weight:700;font-size:16px;">${data.brutto.toLocaleString('de-DE')} €</td></tr>
        <tr><td style="color:#C4922A;padding:4px 0;">IBAN:</td><td>${esc(iban)}</td></tr>
        <tr><td style="color:#C4922A;padding:4px 0;">Verwendungszweck:</td><td>${esc(data.nummer)}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#6B7280;">Falls Sie bereits überwiesen haben: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Zahlungserinnerung: ${data.brutto.toLocaleString('de-DE')} € offen`,
      b
    ),
  }
}

export function mailHandwerkerAnfrage(
  data: {
    name: string
    gewerk: string
    plz: string
    zeitraum?: string | null
    positionen: { beschreibung?: string | null }[]
    link: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const gw = esc(data.gewerk)
  const plz = esc(data.plz)
  const zt = data.zeitraum?.trim() || 'Nach Absprache'
  const lis = data.positionen.map((p) => `<li>${esc(String(p.beschreibung ?? '').trim())}</li>`).join('')
  return {
    betreff: `Neue Anfrage: ${data.gewerk} — Bärenwald München`,
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Neue Anfrage für Sie</h2>
      <p>Guten Tag ${name},</p>
      <p>wir haben eine neue Anfrage im Bereich <strong>${gw}</strong>.</p>
      ${greenBox(`
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#2E7D52;padding:4px 0;width:40%;">Gewerk:</td><td style="font-weight:600;color:#1A3D2B;">${gw}</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Einsatzort:</td><td style="font-weight:600;color:#1A3D2B;">${plz} München</td></tr>
        <tr><td style="color:#2E7D52;padding:4px 0;">Zeitraum:</td><td style="font-weight:600;color:#1A3D2B;">${esc(zt)}</td></tr>
        </table>
      `)}
      <ul style="font-size:14px;line-height:1.8;padding-left:20px;margin:16px 0;">${lis}</ul>
      ${btn('Anfrage ansehen & antworten →', data.link)}
      <p style="font-size:13px;color:#6B7280;">Link:<br/><a href="${esc(data.link)}" style="color:#2E7D52;word-break:break-all;">${esc(data.link)}</a></p>
    `,
      `Neue Anfrage: ${data.gewerk}`,
      b
    ),
  }
}

export function mailHandwerkerFormular(
  data: { name: string; tabName: string; auftragName: string; adresse?: string | null; link: string },
  b: MailBranding
): { betreff: string; html: string } {
  const name = esc(data.name)
  const tel = esc(b.telefon)
  const adr = data.adresse?.trim() ? ` · ${esc(data.adresse.trim())}` : ''
  return {
    betreff: `Formular: ${data.tabName} — ${data.auftragName}`,
    html: base(
      `
      <h2 style="color:#2E7D52;margin:0 0 16px;">Formular zum Ausfüllen</h2>
      <p>Guten Tag ${name},</p>
      <p>bitte füllen Sie das folgende Formular aus:</p>
      ${greenBox(`
        <p style="margin:0;font-size:15px;font-weight:600;color:#1A3D2B;">${esc(data.tabName)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#2E7D52;">${esc(data.auftragName)}${adr}</p>
      `)}
      ${btn('Formular öffnen →', data.link)}
      <p style="font-size:13px;color:#6B7280;">Bei Fragen: <a href="tel:${tel.replace(/\s/g, '')}" style="color:#2E7D52;">${tel}</a></p>
    `,
      `Formular: ${data.tabName}`,
      b
    ),
  }
}

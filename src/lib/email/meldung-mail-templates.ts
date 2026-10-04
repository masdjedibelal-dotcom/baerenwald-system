import { mailHtmlBase } from '@/lib/mail-templates'
import type { MailBranding } from '@/lib/mail-branding'
import { mailTeamGruss } from '@/lib/mail/anrede'
import { buildSubject } from '@/lib/mail/build-subject'
import type { LeadAnlass } from '@/lib/types'
import { formatEuro } from '@/lib/format/geld-datum'
import { C } from '@/lib/tokens/colors'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const KATEGORIE_LABELS: Record<string, string> = {
  notfall: 'Notfall',
  schaden: 'Schaden',
  reparatur: 'Reparatur',
  defekt: 'Defekt',
  sonstiges: 'Sonstiges',
}

const BEREICH_LABELS: Record<string, string> = {
  wasser: 'Wasser / Rohr / WC',
  heizung: 'Heizung / Warmwasser',
  strom: 'Strom / Sicherung',
  fenster_tuer: 'Fenster / Tür',
  dach: 'Dach / Regenrinne',
  schimmel: 'Schimmel / Feuchtigkeit',
  baum_notfall: 'Baum / Sturm',
  sonstiges: 'Etwas anderes',
}

const ZEITRAUM_LABELS: Record<string, string> = {
  sofort: 'So bald wie möglich',
  diese_woche: 'Diese Woche',
  flexibel: 'Flexibel',
}

export function meldeKategorieLabel(kategorie: string): string {
  return KATEGORIE_LABELS[kategorie] ?? kategorie
}

function meldeBereichLabel(id: string | null | undefined): string {
  const v = (id ?? '').trim()
  return BEREICH_LABELS[v] ?? (v ? v.replace(/_/g, ' ') : 'Sonstiges')
}

function zeitraumLabel(raw: string | null | undefined): string | undefined {
  const v = (raw ?? '').trim()
  if (!v) return undefined
  return ZEITRAUM_LABELS[v] ?? v.replace(/_/g, ' ')
}

function mailDataRow(label: string, value: string | undefined | null): string {
  const v = value?.trim()
  if (!v) return ''
  return `<tr>
  <td style="padding:8px 14px;font-size:12px;color:${C.gray500};vertical-align:top;width:130px;border-top:1px solid ${C.gray200}">${esc(label)}</td>
  <td style="padding:8px 14px;font-size:15px;color:${C.gray900b};vertical-align:top;border-top:1px solid ${C.gray200}">${esc(v)}</td>
</tr>`
}

function mailSummaryTable(rows: string): string {
  if (!rows.trim()) return ''
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid ${C.gray200};border-radius:10px;overflow:hidden;background:${C.gray50}">
${rows}
</table>`
}

export type OrgNeueMeldungMailInput = {
  objektTitel: string
  melderName: string
  melderEinheit?: string
  melderTelefon?: string
  melderEmail?: string
  kategorie: string
  bereichId?: string
  beschreibung?: string
  fotoCount?: number
  dringlichkeit?: string | null
  quelle?: 'mieter' | 'hausverwaltung'
  portalLink?: string
  referenz?: string
}

export function buildOrgNeueMeldungSubject(objektTitel: string): string {
  return buildSubject({
    objekt: objektTitel,
    ereignis: 'Neuer Vorgang',
  })
}

export function mailOrgNeueMeldung(
  input: OrgNeueMeldungMailInput,
  b: MailBranding
): { betreff: string; html: string } {
  const kat = meldeKategorieLabel(input.kategorie)
  const bereich = meldeBereichLabel(input.bereichId)
  const quelle = input.quelle ?? 'mieter'
  const einleitung =
    quelle === 'hausverwaltung'
      ? `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang von Ihrer Hausverwaltung erfasst.`
      : `Für <strong>${esc(input.objektTitel)}</strong> wurde ein neuer Vorgang durch eine <strong>Mieter-Meldung</strong> erstellt.`

  const kontakt = [input.melderEmail?.trim(), input.melderTelefon?.trim()]
    .filter(Boolean)
    .join(' · ')

  const rows = [
    mailDataRow('Art', kat),
    mailDataRow('Bereich', bereich),
    mailDataRow(
      'Melder',
      input.melderEinheit?.trim()
        ? `${input.melderName} (${input.melderEinheit.trim()})`
        : input.melderName
    ),
    mailDataRow('Kontakt', kontakt || undefined),
    mailDataRow('Dringlichkeit', zeitraumLabel(input.dringlichkeit)),
    mailDataRow(
      'Fotos',
      input.fotoCount != null && input.fotoCount > 0
        ? `${input.fotoCount} Bild${input.fotoCount === 1 ? '' : 'er'}`
        : undefined
    ),
    mailDataRow('Beschreibung', input.beschreibung),
    mailDataRow('Referenz', input.referenz),
  ].join('')

  const begr = 'Guten Tag,'
  const gruss = mailTeamGruss('sie', b.firmenname)
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${begr}</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">${einleitung}</p>
    ${mailSummaryTable(rows)}
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.55;">Bitte prüfen Sie den Vorgang im Auftraggeber-Portal und wählen Sie den nächsten Schritt (z.&nbsp;B. Angebot einfordern oder Kleinreparatur).</p>
    <p style="font-size:15px;color:${C.gray500};margin:0 0 20px;">Status: Neu · Bereich Meldungen</p>
    <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${gruss}</p>
  `

  return {
    betreff: buildOrgNeueMeldungSubject(input.objektTitel),
    html: mailHtmlBase(body, 'Neuer Vorgang', b, 'Sie erhalten diese Mail, weil für Ihr Objekt ein Vorgang im Auftraggeber-Portal angelegt wurde.', {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: input.portalLink,
    }),
  }
}

export function anfrageBetreffNachAnlass(anlass: LeadAnlass | null | undefined, objektTitel: string): string {
  const ereignis =
    anlass === 'meldung'
      ? 'Meldung eingegangen'
      : anlass === 'projekt'
        ? 'Projektanfrage'
        : anlass === 'servicepaket'
          ? 'Servicepaket-Anfrage'
          : 'Anfrage'
  return buildSubject({ objekt: objektTitel, ereignis })
}

export function mailOrgFreigabeAngefordert(
  data: {
    orgName: string
    objektTitel: string
    betragEur: number
    portalLink: string
    /** Optional: erneut nach Ablehnung — was angepasst wurde. */
    anpassungNotiz?: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const betreff = buildSubject({
    objekt: data.objektTitel,
    ereignis: 'Freigabe erforderlich',
  })
  const anpassung = data.anpassungNotiz?.trim()
  const anpassungBlock = anpassung
    ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>Was angepasst wurde:</strong> ${esc(anpassung)}</p>`
    : ''
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">für <strong>${esc(data.objektTitel)}</strong> liegt ein Angebot über <strong>${esc(
      formatEuro(data.betragEur, { style: 'currency' })
    )}</strong> vor und benötigt Ihre Freigabe.</p>
    ${anpassungBlock}
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">Dies betrifft eine <strong>Mieter-Schadenmeldung</strong>. Bitte im Auftraggeber-Portal freigeben oder ablehnen, bevor Bärenwald den Partner informiert.</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Freigabe erforderlich', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}

/**
 * Direktauftrag-Info-Mail: nur wenn der Auftrag informativ ohne HV-Freigabe-Aktion
 * durchgelaufen ist (Akut-Bypass). Nicht nach HV-Klick „Direkt Bärenwald“ / „Hausmeister“.
 */
export function mailOrgNotfallDirektInfo(
  data: {
    orgName: string
    objektTitel: string
    /** @deprecated Nicht mehr in der Mail; optional für Aufrufer-Kompatibilität. */
    stundensatz?: number
    portalLink: string
  },
  b: MailBranding
): { betreff: string; html: string } {
  const objekt = data.objektTitel.trim() || 'Ihr Objekt'
  const firma = b.firmenname.trim() || 'Bärenwald'
  const betreff = buildSubject({
    objekt,
    ereignis: 'Direktauftrag',
  })
  const gruss = mailTeamGruss('sie', firma)
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">
      für <strong>${esc(objekt)}</strong> haben wir einen <strong>Direktauftrag</strong> angelegt.
      <strong>${esc(firma)}</strong> kümmert sich darum — Sie müssen nichts freigeben.
    </p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">
      Den aktuellen Stand sehen Sie jederzeit im Auftraggeber-Portal.
    </p>
    <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${gruss}</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, 'Direktauftrag angelegt', b, undefined, {
      anrede: 'sie',
      portalAudience: 'organisation',
      portalLink: data.portalLink,
    }),
  }
}

/** HV hat bereits freigegeben / Hausmeister / Direkt beauftragt — keine Info-Direktauftrag-Mail. */
export function hvHatBereitsMeldungGewaehlt(hvMeldungStatus: string | null | undefined): boolean {
  const s = (hvMeldungStatus ?? '').trim().toLowerCase()
  return (
    s === 'angebot_eingefordert' ||
    s === 'hm_pruefung' ||
    s === 'kleinreparatur'
  )
}

export function mailOrgFreigabeErgebnis(
  data: {
    orgName: string
    objektTitel: string
    aktion: 'freigegeben' | 'abgelehnt'
    notiz?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const aktionLabel = data.aktion === 'freigegeben' ? 'freigegeben' : 'abgelehnt'
  const betreff = buildSubject({
    objekt: data.objektTitel,
    ereignis: `Freigabe ${aktionLabel}`,
  })
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>${esc(data.orgName)}</strong> hat die Freigabe für <strong>${esc(data.objektTitel)}</strong> <strong>${aktionLabel}</strong>.</p>
    ${data.notiz?.trim() ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>Notiz:</strong> ${esc(data.notiz.trim())}</p>` : ''}
    <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">Bärenwald setzt den Vorgang im CRM fort.</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, `Freigabe ${aktionLabel}`, b, undefined, {
      skipMeinBaerenwaldPs: true,
    }),
  }
}

/** Portal: Kunde/HV hat Angebot angenommen oder abgelehnt. */
export function mailAngebotEntscheidung(
  data: {
    entscheidenderName: string
    objektTitel: string
    aktion: 'angenommen' | 'abgelehnt'
    notiz?: string | null
  },
  b: MailBranding
): { betreff: string; html: string } {
  const aktionLabel = data.aktion === 'angenommen' ? 'angenommen' : 'abgelehnt'
  const betreff = buildSubject({
    objekt: data.objektTitel,
    ereignis: `Angebot ${aktionLabel}`,
  })
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag,</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>${esc(data.entscheidenderName)}</strong> hat das Angebot für <strong>${esc(data.objektTitel)}</strong> im Portal <strong>${aktionLabel}</strong>.</p>
    ${data.notiz?.trim() ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;"><strong>Notiz:</strong> ${esc(data.notiz.trim())}</p>` : ''}
    <p style="font-size:15px;color:${C.gray700};margin:0;line-height:1.6;">${data.aktion === 'angenommen' ? 'Der Auftrag wurde angelegt bzw. wird im CRM fortgeführt.' : 'Bitte Vorgang im CRM prüfen.'}</p>
  `
  return {
    betreff,
    html: mailHtmlBase(body, `Angebot ${aktionLabel}`, b, undefined, {
      skipMeinBaerenwaldPs: true,
    }),
  }
}

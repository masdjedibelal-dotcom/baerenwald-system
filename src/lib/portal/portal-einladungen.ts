/**
 * Portal-Einladungs-Token (geteilt mit MeinBärenwald / Auftraggeber-Portal).
 * CRM erzeugt Links auf die öffentliche Website — Redeem läuft im Portal.
 */

export const PORTAL_EINLADUNG_EXPIRES_DAYS = 30

function portalOrigin(): string {
  return (
    process.env.FRONTEND_URL ??
    process.env.NEXT_PUBLIC_WEBSEITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  const b64 = Buffer.from(bytes).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function createPortalEinladungToken(): string {
  const bytes = new Uint8Array(24)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return bytesToBase64Url(bytes)
}

export function portalEinladungExpiresAt(
  from: Date = new Date(),
  days = PORTAL_EINLADUNG_EXPIRES_DAYS
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}

export function buildPortalEinladungUrl(token: string): string {
  return `${portalOrigin()}/portal/einladung/${encodeURIComponent(token.trim())}`
}

export type PortalEinladungRolle = 'mieter' | 'eigentuemer'

/** mailto für Mieter-/Eigentümer-Portal-Einladung (HV-Absender via Mail-App). */
export function buildBewohnerPortalEinladungMailto(opts: {
  link: string
  hvName: string
  objektLabel: string
  einheitRef?: string | null
  toEmail?: string | null
  rolle?: PortalEinladungRolle | null
}): string {
  const hvName = opts.hvName.trim() || 'Ihre Verwaltung'
  const objekt = opts.objektLabel.trim() || 'Objekt'
  const we = opts.einheitRef?.trim()
  const where = we ? `${objekt} · ${we}` : objekt
  const rolle: PortalEinladungRolle =
    opts.rolle === 'eigentuemer' ? 'eigentuemer' : 'mieter'
  const rolleLabel = rolle === 'eigentuemer' ? 'Eigentümer' : 'Mieter'
  const bodyLines =
    rolle === 'eigentuemer'
      ? [
          'Guten Tag,',
          '',
          `hiermit laden wir Sie herzlich ein, Ihr Eigentümer-Konto in unserem Portal anzulegen und mit Ihrer Einheit (${where}) zu verknüpfen.`,
          '',
          'Im Portal behalten Sie Freigaben und Vorgänge im Blick und entscheiden dort, wo Ihre Zustimmung nötig ist.',
          '',
          'Bitte nutzen Sie diesen persönlichen Link (zeitlich begrenzt):',
          opts.link,
          '',
          'Viele Grüße',
          hvName,
        ]
      : [
          'Guten Tag,',
          '',
          `hiermit laden wir Sie herzlich ein, Ihr Mieter-Konto in unserem Portal anzulegen und mit Ihrer Wohnung (${where}) zu verknüpfen.`,
          '',
          'Im Portal können Sie Schäden und Anliegen direkt melden und den Bearbeitungsstand verfolgen.',
          '',
          'Bitte nutzen Sie diesen persönlichen Link (zeitlich begrenzt):',
          opts.link,
          '',
          'Viele Grüße',
          hvName,
        ]
  const subj = encodeURIComponent(`Portal-Einladung (${rolleLabel}) — ${where}`)
  const body = encodeURIComponent(bodyLines.join('\n'))
  const to = opts.toEmail?.trim() ?? ''
  const toPart = to ? encodeURIComponent(to) : ''
  return `mailto:${toPart}?subject=${subj}&body=${body}`
}

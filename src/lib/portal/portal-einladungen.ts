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

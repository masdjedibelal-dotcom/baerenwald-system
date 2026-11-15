/**
 * Signierte Portal-Einladung (CRM → Portal), nur serverseitig.
 *
 * Bei Marken mit `nurEinladung` (TEO) darf sich nur registrieren, wer einen Einladungslink
 * aus dem CRM hat oder von seiner Verwaltung eingeladen wurde. Der Link trägt `einladung=<ablauf>.<signatur>`
 * für genau diese E-Mail. Schlüssel: Service-Role-Key (CRM und Portal teilen dieselbe Datenbank).
 * Wird per `npm run sync:shared-domain` ins Portal kopiert.
 */
import { createHmac, timingSafeEqual } from 'crypto'

const GUELTIG_TAGE = 30

function signatur(email: string, ablauf: number): string {
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!schluessel) throw new Error('SUPABASE_SERVICE_ROLE_KEY fehlt')
  return createHmac('sha256', schluessel).update(`portal-einladung|${email}|${ablauf}`).digest('base64url')
}

function norm(email: string): string {
  return email.trim().toLowerCase()
}

export function portalEinladungToken(email: string, jetztMs: number = Date.now()): string {
  const ablauf = Math.floor(jetztMs / 1000) + GUELTIG_TAGE * 86400
  return `${ablauf}.${signatur(norm(email), ablauf)}`
}

export function pruefePortalEinladungToken(email: string, token: string | null | undefined, jetztMs: number = Date.now()): boolean {
  const [ablaufText, sig] = String(token ?? '').trim().split('.')
  const ablauf = Number(ablaufText)
  if (!sig || !Number.isFinite(ablauf) || ablauf * 1000 < jetztMs) return false
  const soll = Buffer.from(signatur(norm(email), ablauf))
  const ist = Buffer.from(sig)
  return soll.length === ist.length && timingSafeEqual(soll, ist)
}

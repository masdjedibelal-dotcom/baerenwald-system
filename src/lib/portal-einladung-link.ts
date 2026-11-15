import 'server-only'
import { funktionAn } from '@/lib/marke'
import { portalEinladungToken } from '@/lib/portal-einladung-token'
import { buildPartnerDashboardLink, buildPortalLoginLink, publicWebsiteBaseUrl } from '@/lib/portal-utils'

/**
 * Link für „Zugang zum Portal“-Mails an Kunden/Verwaltungen.
 * Marken mit `nurEinladung` (TEO): Registrierung mit signierter Einladung für genau diese E-Mail,
 * solange noch kein Konto besteht. Sonst (oder mit Konto): Login wie bisher.
 */
export function kundenPortalEinladungLink(k: { email?: string | null; name?: string | null; auth_user_id?: string | null }): string {
  const email = String(k.email ?? '').trim().toLowerCase()
  if (!funktionAn('nurEinladung') || !email || k.auth_user_id) return buildPortalLoginLink()
  const q = new URLSearchParams({ email, locked: '1', einladung: portalEinladungToken(email) })
  const name = String(k.name ?? '').trim()
  if (name) q.set('name', name)
  return `${publicWebsiteBaseUrl()}/portal/registrieren?${q}`
}

/**
 * Link für Partner-Einladungen. `nurEinladung`: direkt zur Registrierung (Betrieb muss im CRM angelegt sein),
 * solange noch kein Konto besteht. Sonst Partner-Portal wie bisher.
 */
export function partnerPortalEinladungLink(h: { auth_user_id?: string | null }): string {
  if (!funktionAn('nurEinladung') || h.auth_user_id) return buildPartnerDashboardLink()
  return `${publicWebsiteBaseUrl()}/partner/registrieren`
}

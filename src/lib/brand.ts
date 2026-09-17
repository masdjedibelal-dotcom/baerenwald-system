/**
 * Zentrale Marken-Assets (Bärenwald Baum-Logo).
 * Dateien unter /public/brand/
 */

import { getPublicAppUrl } from '@/lib/utils'

export const BRAND_ALT = 'Bärenwald München'

/** Grün auf hellem Hintergrund (Login, helle Flächen) */
export const BRAND_LOGO_GREEN = '/brand/logo-mark-green.png'

/** Weiß auf dunklem Hintergrund (Sidebar, E-Mail-Kopf, Status-Seiten) */
export const BRAND_LOGO_WHITE = '/brand/logo-mark-white.png'

/** Logo auf grünem Badge — für Avatare / Profilbild */
export const BRAND_LOGO_BADGE = '/brand/logo-badge-green-bg.png'

export type BrandLogoVariant = 'green' | 'white'

export function brandLogoPath(variant: BrandLogoVariant): string {
  return variant === 'white' ? BRAND_LOGO_WHITE : BRAND_LOGO_GREEN
}

/** Öffentliche Website — einzige stabile Quelle für Remote-Logos in Mails. */
const WEBSITE_LOGO_HOST = 'https://baerenwaldmuenchen.de'

function isPublicLogoHost(raw: string): boolean {
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h === '127.0.0.1') return false
    if (h.includes('baerenwald-backend')) return false
    if (h.endsWith('.netlify.app') && h.includes('backend')) return false
    return true
  } catch {
    return false
  }
}

/** Host mit öffentlich erreichbaren Logo-PNGs (Website). Nie localhost / CRM-Netlify. */
function emailLogoHostFallback(): string {
  const explicit = process.env.NEXT_PUBLIC_EMAIL_LOGO_HOST?.trim().replace(/\/$/, '')
  if (explicit && isPublicLogoHost(explicit)) return explicit.replace(/\/$/, '')
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (site && isPublicLogoHost(site)) return site
  return WEBSITE_LOGO_HOST
}

function websiteLogoPath(variant: BrandLogoVariant): string {
  // Kleine Mail-Variante (~14 KB) — besser für Clients als logo-mark (~90 KB)
  return variant === 'white' ? '/mail-logo-white.png' : '/mail-logo-green.png'
}

/**
 * Absolute Logo-URL für E-Mails — gehostet auf der Website (HTTPS, kein CID):
 * https://baerenwaldmuenchen.de/mail-logo-green.png (bzw. -white)
 */
export function resolveBrandLogoUrl(
  variant: BrandLogoVariant = 'white',
  explicitOverride?: string | null
): string {
  const custom = explicitOverride?.trim()
  if (custom) {
    if (/^https?:\/\//i.test(custom)) return custom
    return `${emailLogoHostFallback()}${custom.startsWith('/') ? custom : `/${custom}`}`
  }

  const envLogo = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim()
  if (envLogo) return envLogo

  return `${emailLogoHostFallback()}${websiteLogoPath(variant)}`
}

export function resolvePublicAppUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (base) return `${base}${normalized}`
  return `${getPublicAppUrl()}${normalized}`
}

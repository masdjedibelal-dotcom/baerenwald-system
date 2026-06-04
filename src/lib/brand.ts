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

export type BrandLogoVariant = 'green' | 'white'

export function brandLogoPath(variant: BrandLogoVariant): string {
  return variant === 'white' ? BRAND_LOGO_WHITE : BRAND_LOGO_GREEN
}

/** Host mit öffentlich erreichbaren Logo-PNGs (Website), Fallback wenn CRM-/public-Logo fehlt. */
function emailLogoHostFallback(): string {
  return (
    process.env.NEXT_PUBLIC_EMAIL_LOGO_HOST?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://baerenwaldmuenchen.de'
  )
}

function websiteLogoPath(variant: BrandLogoVariant): string {
  return variant === 'white' ? '/logo-mark-white.png' : '/logo-mark-green.png'
}

/** Absolute URL für E-Mails (Resend braucht https://…). */
export function resolveBrandLogoUrl(
  variant: BrandLogoVariant = 'white',
  explicitOverride?: string | null
): string {
  const custom = explicitOverride?.trim()
  if (custom) {
    if (/^https?:\/\//i.test(custom)) return custom
    const fromApp = resolvePublicAppUrl(custom)
    if (/^https?:\/\//i.test(fromApp)) return fromApp
    return `${emailLogoHostFallback()}${custom.startsWith('/') ? custom : `/${custom}`}`
  }

  const envLogo = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim()
  if (envLogo) return envLogo

  const fromApp = resolvePublicAppUrl(brandLogoPath(variant))
  if (/^https?:\/\//i.test(fromApp)) return fromApp

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

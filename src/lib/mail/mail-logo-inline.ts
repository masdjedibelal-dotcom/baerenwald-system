import type { BrandLogoVariant } from '@/lib/brand'

/**
 * Mail-Logos als HTTPS auf baerenwaldmuenchen.de — kein CID-Anhang.
 * Apple Mail zeigt CID oft als Büroklammer + kaputtes Bild.
 */

export const MAIL_LOGO_HOST = 'https://baerenwaldmuenchen.de'
export const MAIL_LOGO_URL_GREEN = `${MAIL_LOGO_HOST}/mail-logo-green.png`
export const MAIL_LOGO_URL_WHITE = `${MAIL_LOGO_HOST}/mail-logo-white.png`

/** @deprecated früher CID */
export const MAIL_LOGO_CID_GREEN = 'baerenwald-logo-green'
/** @deprecated */
export const MAIL_LOGO_CID_WHITE = 'baerenwald-logo-white'

/**
 * CID-Anhänge nur wenn explizit MAIL_LOGO_INLINE=true (Debug).
 * Default: aus — gehostete URLs.
 */
export function mailLogoInlineEnabled(): boolean {
  return process.env.MAIL_LOGO_INLINE === 'true'
}

/** Alle Logo-src → stabile HTTPS-URLs (kein cid:). */
export function rewriteMailLogoUrlsToHosted(html: string): string {
  return html
    .replace(
      /src=(["'])([^"']*(?:logo-mark-green|mail-logo-green)\.png[^"']*|cid:baerenwald-logo-green)\1/gi,
      `src=$1${MAIL_LOGO_URL_GREEN}$1`
    )
    .replace(
      /src=(["'])([^"']*(?:logo-mark-white|mail-logo-white)\.png[^"']*|cid:baerenwald-logo-white)\1/gi,
      `src=$1${MAIL_LOGO_URL_WHITE}$1`
    )
}

/** @deprecated — schreibt auf Hosted-URLs, nicht mehr CID */
export function rewriteMailLogoUrlsToCid(html: string): string {
  return rewriteMailLogoUrlsToHosted(html)
}

export function mailLogoCid(variant: BrandLogoVariant): string {
  return variant === 'white' ? MAIL_LOGO_CID_WHITE : MAIL_LOGO_CID_GREEN
}

export function mailLogoCidSrc(variant: BrandLogoVariant): string {
  // Templates sollen HTTPS nutzen, nicht cid:
  return variant === 'white' ? MAIL_LOGO_URL_WHITE : MAIL_LOGO_URL_GREEN
}

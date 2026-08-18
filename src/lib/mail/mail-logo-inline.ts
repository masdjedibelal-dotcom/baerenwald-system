import type { BrandLogoVariant } from '@/lib/brand'

/** Content-IDs für eingebettete Logos (Resend CID — wie lokales Asset im Portal). */
export const MAIL_LOGO_CID_GREEN = 'baerenwald-logo-green'
export const MAIL_LOGO_CID_WHITE = 'baerenwald-logo-white'

/**
 * Logo als CID-Anhang (unabhängig von Website/CRM-URL).
 * Abschalten nur mit MAIL_LOGO_INLINE=false.
 */
export function mailLogoInlineEnabled(): boolean {
  return process.env.MAIL_LOGO_INLINE !== 'false'
}

/** Remote-Logo-URLs (auch localhost / CRM-Host) auf cid: umbiegen. */
export function rewriteMailLogoUrlsToCid(html: string): string {
  return html
    .replace(
      /src=(["'])([^"']*(?:logo-mark-green|mail-logo-green)\.png[^"']*|cid:baerenwald-logo-green)\1/gi,
      `src=$1cid:${MAIL_LOGO_CID_GREEN}$1`
    )
    .replace(
      /src=(["'])([^"']*(?:logo-mark-white|mail-logo-white)\.png[^"']*|cid:baerenwald-logo-white)\1/gi,
      `src=$1cid:${MAIL_LOGO_CID_WHITE}$1`
    )
}

export function mailLogoCid(variant: BrandLogoVariant): string {
  return variant === 'white' ? MAIL_LOGO_CID_WHITE : MAIL_LOGO_CID_GREEN
}

export function mailLogoCidSrc(variant: BrandLogoVariant): string {
  return `cid:${mailLogoCid(variant)}`
}

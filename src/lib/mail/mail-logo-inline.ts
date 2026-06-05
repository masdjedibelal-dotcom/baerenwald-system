import type { BrandLogoVariant } from '@/lib/brand'

/** Content-IDs für eingebettete Logos (Resend CID — wie lokales Asset im Portal). */
export const MAIL_LOGO_CID_GREEN = 'baerenwald-logo-green'
export const MAIL_LOGO_CID_WHITE = 'baerenwald-logo-white'

/** Standard: feste HTTPS-URL (wie Webseite). Nur bei MAIL_LOGO_INLINE=true CID-Anhang. */
export function mailLogoInlineEnabled(): boolean {
  return process.env.MAIL_LOGO_INLINE === 'true'
}

export function mailLogoCid(variant: BrandLogoVariant): string {
  return variant === 'white' ? MAIL_LOGO_CID_WHITE : MAIL_LOGO_CID_GREEN
}

export function mailLogoCidSrc(variant: BrandLogoVariant): string {
  return `cid:${mailLogoCid(variant)}`
}

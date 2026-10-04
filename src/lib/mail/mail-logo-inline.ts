
/**
 * Mail-Logos als HTTPS auf baerenwaldmuenchen.de — kein CID-Anhang.
 * Apple Mail zeigt CID oft als Büroklammer + kaputtes Bild.
 */

export const MAIL_LOGO_HOST = 'https://baerenwaldmuenchen.de'
export const MAIL_LOGO_URL_GREEN = `${MAIL_LOGO_HOST}/mail-logo-green.png`
export const MAIL_LOGO_URL_WHITE = `${MAIL_LOGO_HOST}/mail-logo-white.png`

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

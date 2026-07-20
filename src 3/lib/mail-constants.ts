/** Gemeinsame Mail-Konstanten (ohne Server-Imports — auch in Client-Komponenten nutzbar). */

/** Internes Postfach — automatische BCC-Kopie bei Kunden-Mails (unsichtbar für Empfänger). */
export const KUNDE_MAIL_BCC = 'info@baerenwald-muenchen.de'

/** Alias (Legacy-Name); neue Logik nutzt BCC statt sichtbarem CC. */
export const ANGEBOT_KUNDE_MAIL_CC = KUNDE_MAIL_BCC

/** Hinweis in Versand-Dialogen */
export const KUNDE_MAIL_BCC_HINT =
  'Bärenwald erhält automatisch eine Kopie (BCC — für den Kunden nicht sichtbar).'

import { MARKE } from '@/lib/marke'
/** Gemeinsame Mail-Konstanten (ohne Server-Imports — auch in Client-Komponenten nutzbar). */

/** Internes Postfach — automatische BCC-Kopie bei Kunden-Mails (unsichtbar für Empfänger). */
export const KUNDE_MAIL_BCC = MARKE.infoEmail

/** Servus TEO: Kopie (BCC) jeder CRM-Mail an die Inhaber — außer Passwort-Mails. */
export const MARKE_MAIL_BCC_IMMER: readonly string[] =
  MARKE.id === 'teo' ? ['info@baerenwald-muenchen.de', 'belal.masdjedi@yahoo.de'] : []

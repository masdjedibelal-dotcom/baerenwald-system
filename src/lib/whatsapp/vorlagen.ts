/**
 * WhatsApp-Vorlagen (Message Templates). Außerhalb des 24-Stunden-Fensters darf ein Unternehmen
 * nur freigegebene Vorlagen schicken. Diese Vorlagen werden nach dem Anlegen des 360dialog-Kontos
 * einmal im 360dialog-Hub (bzw. Meta Business Manager) eingereicht — Name, Sprache „de“,
 * Kategorie „Utility“, Text und Knöpfe genau wie unten.
 *
 * Der Testmodus zeigt im Chat denselben Text, den der Empfänger später sieht.
 */

export type VorlagenName = 'bw_einsatz_neu' | 'bw_bautagebuch' | 'bw_nachricht'

export type VorlagenDefinition = {
  name: VorlagenName
  /** Text mit Platzhaltern {{1}}, {{2}} … (so wird er bei Meta eingereicht) */
  text: string
  /** Schnellantwort-Knöpfe (Titel; die Antwort-ID setzt das CRM je Nachricht) */
  knoepfe?: string[]
  beschreibung: string
}

export const VORLAGEN: Record<VorlagenName, VorlagenDefinition> = {
  bw_einsatz_neu: {
    name: 'bw_einsatz_neu',
    text:
      'Hallo {{1}}, Bärenwald hat einen neuen Einsatz für Sie:\n\n*{{2}}*\nTermin: {{3}}\nOrt: {{4}}\nEK: {{5}}\n\n{{6}}\n\nBitte nehmen Sie den Einsatz an oder lehnen Sie ihn ab.',
    knoepfe: ['Annehmen', 'Ablehnen'],
    beschreibung: 'Neuer Einsatz an einen Partner, mit Annehmen/Ablehnen.',
  },
  bw_bautagebuch: {
    name: 'bw_bautagebuch',
    text:
      'Guten Tag {{1}}, es gibt ein neues Update zu Ihrem Projekt „{{2}}“:\n\n{{3}}\n\nFotos und alle Details: {{4}}',
    beschreibung: 'Bautagebuch-Eintrag an den Kunden, mit Link zur Projektseite.',
  },
  bw_nachricht: {
    name: 'bw_nachricht',
    text: 'Nachricht von Bärenwald:\n\n{{1}}',
    beschreibung: 'Freie Nachricht, wenn der Kontakt seit über 24 Stunden nicht geschrieben hat.',
  },
}

/** Text der Vorlage mit eingesetzten Werten (für Testmodus und Anzeige im Chat). */
export function vorlageText(name: VorlagenName, werte: string[]): string {
  return VORLAGEN[name].text.replace(/\{\{(\d+)\}\}/g, (_, n: string) => werte[Number(n) - 1] ?? '')
}

/** Antwort-ID eines Einsatz-Knopfs: „einsatz:<id>:annehmen“. */
export function einsatzKnopfId(einsatzId: string, antwort: 'annehmen' | 'ablehnen'): string {
  return `einsatz:${einsatzId}:${antwort}`
}

export function parseEinsatzKnopfId(
  id: string | null | undefined
): { einsatzId: string; antwort: 'annehmen' | 'ablehnen' } | null {
  const m = String(id ?? '').match(/^einsatz:([0-9a-f-]{36}):(annehmen|ablehnen)$/i)
  return m ? { einsatzId: m[1]!, antwort: m[2]!.toLowerCase() as 'annehmen' | 'ablehnen' } : null
}

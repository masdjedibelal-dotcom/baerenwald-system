import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { VertragHandwerkerSnapshot } from '@/lib/vertraege/types'
import { handwerkerAnzeigename, handwerkerVertreterName } from '@/lib/vertraege/build-vertrag-texte'
import type { VertragParagraph } from '@/lib/vertraege/klauseln'

/** Platzhalter für RV-Anlagen (Firmen- + Partnerdaten aus PDF-Payload). */
export function rahmenVertragPlatzhalter(
  firm: FirmenEinstellungen,
  hw: VertragHandwerkerSnapshot
): Record<string, string> {
  const agName = [firm.firmenname?.trim(), firm.rechtsform?.trim()].filter(Boolean).join(', ')
  const agAdr = [firm.strasse?.trim(), [firm.plz, firm.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return {
    auftraggeber: agName || 'Bärenwald München',
    auftraggeber_adresse: agAdr || '—',
    auftraggeber_vertreter: firm.geschaeftsfuehrer?.trim() || firm.firmenname?.trim() || 'Geschäftsführung',
    partner: handwerkerAnzeigename(hw),
    partner_adresse: hw.adresse?.trim() || '—',
    partner_vertreter: handwerkerVertreterName(hw),
  }
}

/** Anlage 1: Partner verarbeitet Endkundendaten im Auftrag von {{auftraggeber}}. */
export const RAHMEN_AVV_ANLAGE_1: VertragParagraph[] = [
  {
    nr: '§1',
    title: 'Gegenstand und Dauer',
    body:
      'Dieser Auftragsverarbeitungsvertrag (AVV) regelt die Verarbeitung personenbezogener Daten durch den Auftragsverarbeiter im Auftrag des Verantwortlichen gemäß Art. 28 DSGVO. Er gilt für die Dauer des Partner-Rahmenvertrags zwischen {{auftraggeber}} (Verantwortlicher) und {{partner}} (Auftragsverarbeiter) sowie für die jeweiligen Projekt-Nachunternehmerverträge.',
  },
  {
    nr: '§2',
    title: 'Weisungsgebundenheit',
    body:
      'Der Auftragsverarbeiter verarbeitet personenbezogene Daten ausschließlich auf dokumentierte Weisung des Verantwortlichen — in Textform (E-Mail, Partner-Portal, Projektunterlagen) — und nur soweit dies für die vertragliche Leistungserbringung erforderlich ist. Weisungen außerhalb dieses Rahmens bedürfen der gesonderten schriftlichen Zustimmung.',
  },
  {
    nr: '§3',
    title: 'Art und Zweck der Verarbeitung',
    body:
      'Zweck: Planung, Koordination und Ausführung von Bauleistungen; Arbeitsschutz; Nachweisführung; Kommunikation mit Auftraggeber und Bauherrn. Betroffene Personen: Endkunden/Bauherren, Ansprechpartner, Bewohner, Mitarbeiter des Verantwortlichen. Datenarten: Name, Anschrift, Kontaktdaten, Projektdaten, Termine, Baustellenfotos (ohne unnötige Abbildung erkennbarer Personen).',
  },
  {
    nr: '§4',
    title: 'Pflichten des Auftragsverarbeiters',
    body:
      'Der Auftragsverarbeiter gewährleistet Vertraulichkeit, setzt angemessene technische und organisatorische Maßnahmen (TOMs) um, unterstützt den Verantwortlichen bei Betroffenenanfragen (soweit zumutbar), meldet Datenschutzverletzungen unverzüglich, spätestens innerhalb von 24 Stunden nach Kenntnis, und nutzt die Daten nicht für eigene Marketing- oder Kundenwerbezwecke.',
  },
  {
    nr: '§5',
    title: 'Unterauftragsverarbeiter',
    body:
      'Der Einsatz weiterer Auftragsverarbeiter (Subunternehmer auf der Baustelle, IT-Dienstleister) bedarf der vorherigen schriftlichen Genehmigung des Verantwortlichen, sofern es sich nicht um allgemein übliche Werkzeuge mit Standard-Datenschutzverträgen handelt. Der Auftragsverarbeiter bleibt für die Einhaltung der Datenschutzpflichten voll verantwortlich.',
  },
  {
    nr: '§6',
    title: 'Kontrolle, Löschung, Drittland',
    body:
      'Der Verantwortliche kann die Einhaltung dieses AVV angemessen prüfen. Nach Beendigung der Auftragsverarbeitung löscht oder gibt der Auftragsverarbeiter die Daten auf Weisung zurück, sofern keine gesetzliche Aufbewahrungspflicht entgegensteht. Übermittlungen in Drittländer erfolgen nur auf Weisung und unter den Voraussetzungen von Art. 44 ff. DSGVO.',
  },
]

/** Anlage 2: {{auftraggeber}} verarbeitet Partner-/Mitarbeiterdaten im CRM und Partner-Portal. */
export const RAHMEN_AVV_ANLAGE_2: VertragParagraph[] = [
  {
    nr: '§1',
    title: 'Gegenstand und Dauer',
    body:
      'Dieser AVV regelt die Verarbeitung personenbezogener Daten durch {{auftraggeber}} (Auftragsverarbeiter) im Auftrag von {{partner}} (Verantwortlicher) gemäß Art. 28 DSGVO. Gegenstand ist die Speicherung und Verwaltung von Partner-Stammdaten, Compliance-Nachweisen und Mitarbeiterlisten im CRM und Partner-Portal des Auftraggebers.',
  },
  {
    nr: '§2',
    title: 'Weisungsgebundenheit',
    body:
      'Der Auftragsverarbeiter verarbeitet die Daten ausschließlich auf Weisung des Verantwortlichen, insbesondere durch Upload und Pflege im Partner-Portal sowie zur Erfüllung gesetzlicher Nachweispflichten im Rahmen der Zusammenarbeit.',
  },
  {
    nr: '§3',
    title: 'Art und Zweck der Verarbeitung',
    body:
      'Zweck: Partner-Onboarding, Compliance-Prüfung, Vertrags- und Nachweisverwaltung, Kommunikation. Betroffene Personen: Mitarbeiter und Vertreter des Partners. Datenarten: Name, Kontaktdaten, Anschrift, Steuer-/Bankdaten des Partners, Ausweiskopien, Personallisten, Sicherheits- und Versicherungsnachweise, hochgeladene Dokumente.',
  },
  {
    nr: '§4',
    title: 'Pflichten des Auftragsverarbeiters',
    body:
      'Der Auftragsverarbeiter setzt TOMs um (Zugriffsbeschränkung, Verschlüsselung bei Übertragung, Berechtigungskonzept, Backups), gewährleistet Vertraulichkeit, meldet Datenschutzverletzungen unverzüglich, spätestens innerhalb von 24 Stunden, und stellt dem Verantwortlichen auf Anfrage die erforderlichen Informationen zur Verfügung.',
  },
  {
    nr: '§5',
    title: 'Unterauftragsverarbeiter',
    body:
      'Der Verantwortliche genehmigt den Einsatz folgender Kategorien von Unterauftragsverarbeitern: Cloud-Hosting und Datenbank (z. B. Supabase), E-Mail-Versand (z. B. Resend), Hosting der Webanwendungen. Weitere Unterauftragsverarbeiter werden dem Verantwortlichen auf Anfrage mitgeteilt.',
  },
  {
    nr: '§6',
    title: 'Löschung und Aufbewahrung',
    body:
      'Nach Beendigung des Rahmenvertrags werden personenbezogene Daten des Partners auf Weisung gelöscht oder zurückgegeben, soweit keine gesetzlichen Aufbewahrungspflichten (z. B. steuer- oder handelsrechtlich) entgegenstehen. In diesem Fall ist die Datenverarbeitung auf die Aufbewahrung zu beschränken (Sperrung).',
  },
]

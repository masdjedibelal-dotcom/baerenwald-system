/** Statische Vertragsparagraphen (Projekt-Nachunternehmervertrag) */

export type VertragParagraph = { nr: string; title: string; body: string }

export const PROJEKT_NU_PARAGRAPHEN: VertragParagraph[] = [
  {
    nr: '§1',
    title: 'Vertragsgegenstand',
    body:
      'Der Nachunternehmer übernimmt die vollständige fachgerechte Ausführung sämtlicher vereinbarter {{leistung_schwerpunkt}} einschließlich aller Nebenleistungen nach den anerkannten Regeln der Technik, DIN-Normen, Herstellervorgaben sowie den Anweisungen des Auftraggebers. Änderungen und Ergänzungen des Leistungsumfangs bedürfen der vorherigen schriftlichen Vereinbarung des Auftraggebers.',
  },
  {
    nr: '§4',
    title: 'Aufmaß und Abschläge',
    body:
      'Gemeinsames Aufmaß erfolgt im Abstand von {{aufmass}} Kalendertagen. Abschlagsrechnungen werden ausschließlich auf Grundlage der vom Auftraggeber bestätigten Mengen gestellt. Zahlungsziel für fällige Rechnungsbeträge beträgt {{zahlungsziel}} Tage ab Rechnungsdatum.',
  },
  {
    nr: '§5',
    title: 'Personal',
    body:
      'Der Nachunternehmer stellt eine ausreichende Personalstärke zur termingerechten Ausführung bereit. Auf größeren Baustellen sind mindestens zwei Vorarbeiter sowie ein verantwortlicher Bauleiter bzw. Polier dauerhaft einzusetzen.',
  },
  {
    nr: '§6',
    title: 'Nachweise',
    body:
      'Vor Arbeitsbeginn und auf Anforderung sind vollständig vorzulegen: Gewerbeanmeldung, Freistellungsbescheinigungen nach § 13b und § 48b EStG, Nachweis der Berufsgenossenschaft, SOKA-Bau-Nachweis, Betriebshaftpflichtversicherung sowie aktuelle Personallisten.',
  },
  {
    nr: '§7',
    title: 'Dokumentation',
    body:
      'Der Nachunternehmer verpflichtet sich zur täglichen Fotodokumentation, zur Dokumentation verdeckter Leistungen vor deren Verdeckung, zur Erstellung von Leistungsberichten sowie zur Mitwirkung an den Bautagesberichten des Auftraggebers.',
  },
  {
    nr: '§8',
    title: 'Arbeitsschutz',
    body:
      'Der Nachunternehmer trägt die alleinige Verantwortung für die Einhaltung aller gesetzlichen Arbeitsschutz-, Sicherheits- und Unfallverhütungsvorschriften auf der Baustelle. Er stellt die erforderlichen Schutzmaßnahmen auf eigene Kosten sicher.',
  },
  {
    nr: '§9',
    title: 'Haftung',
    body:
      'Der Nachunternehmer haftet für sämtliche Schäden, Mängel und Folgeschäden, die durch ihn, seine Mitarbeiter oder von ihm beauftragte Subunternehmer verursacht werden, und stellt den Auftraggeber von Ansprüchen Dritter frei.',
  },
  {
    nr: '§10',
    title: 'Gewährleistung',
    body:
      'Die Gewährleistungsfrist beträgt fünf (5) Jahre ab Abnahme der jeweiligen Leistung. Festgestellte Mängel sind unverzüglich und auf eigene Kosten zu beseitigen.',
  },
  {
    nr: '§11',
    title: 'Sicherheitseinbehalt',
    body:
      'Der Auftraggeber ist berechtigt, {{einbehalt}} % der Netto-Schlussrechnungssumme als Sicherheitseinbehalt zurückzubehalten oder diesen gegen eine gleichwertige Gewährleistungsbürgschaft freizugeben.',
  },
  {
    nr: '§12',
    title: 'Vertraulichkeit und Kundenschutz',
    body:
      'Direkte Geschäftsbeziehungen zu durch den Auftraggeber vermittelten Auftraggebern oder Projektpartnern sind während der Vertragslaufzeit und für einen Zeitraum von 24 Monaten nach Projektende ausgeschlossen.',
  },
  {
    nr: '§13',
    title: 'Kündigung',
    body:
      'Bei erheblichen Qualitätsmängeln, wiederholten Terminverzögerungen, Sicherheitsverstößen oder sonstigem vertragswidrigem Verhalten ist dem Auftraggeber eine außerordentliche Kündigung aus wichtigem Grund zulässig.',
  },
  {
    nr: '§14',
    title: 'Gerichtsstand',
    body:
      'Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist München, soweit gesetzlich zulässig. Es gilt das Recht der Bundesrepublik Deutschland.',
  },
]

export const PROJEKT_NU_ANLAGE_NACHWEISE = [
  'Freistellungsbescheinigung § 13b EStG (Bauleistungen)',
  'Freistellungsbescheinigung § 48b EStG',
  'Gewerbeanmeldung',
  'Betriebshaftpflichtversicherung',
  'Berufsgenossenschaftsnachweis',
  'SOKA-Bau Nachweis',
  'Personalliste aller eingesetzten Mitarbeiter',
  'Ausweiskopien und ggf. A1-Bescheinigungen',
  'Benennung eines verantwortlichen Bauleiters',
]

export const RAHMEN_PARAGRAPHEN: VertragParagraph[] = [
  {
    nr: '§1',
    title: 'Vertragsgegenstand und Partnerschaft',
    body:
      'Zwischen dem Auftraggeber Bärenwald München (nachfolgend „Auftraggeber“) und dem Partner (nachfolgend „Nachunternehmer“) wird eine dauerhafte Zusammenarbeit als Nachunternehmer vereinbart. Der Nachunternehmer erbringt handwerkliche Leistungen im Rahmen einzelner Bauprojekte des Auftraggebers. Für jedes Projekt wird ein gesonderter Projekt-Nachunternehmervertrag mit konkretem Leistungs- und Vergütungsumfang geschlossen, der ergänzend zu diesem Rahmenvertrag gilt.',
  },
  {
    nr: '§2',
    title: 'Nachweise und Compliance',
    body:
      'Der Nachunternehmer verpflichtet sich, vor erster Leistungserbringung und auf Anforderung aktuelle Nachweise vorzulegen, insbesondere Gewerbeanmeldung, Freistellungsbescheinigungen nach § 13b und § 48b EStG, Berufsgenossenschaftsnachweis, SOKA-Bau-Nachweis sowie eine gültige Betriebshaftpflichtversicherung. Die Nachweise sind während der gesamten Zusammenarbeit gültig zu halten und im Partner-Portal aktuell zu pflegen.',
  },
  {
    nr: '§3',
    title: 'Qualität, Arbeitsschutz und Dokumentation',
    body:
      'Sämtliche Leistungen sind nach anerkannten Regeln der Technik, den einschlägigen DIN-Normen und Herstellervorgaben auszuführen. Der Nachunternehmer gewährleistet die Einhaltung des Arbeitsschutzes, eine tägliche Fotodokumentation sowie die Mitwirkung an Bautagesberichten des Auftraggebers.',
  },
  {
    nr: '§4',
    title: 'Haftung und Gewährleistung',
    body:
      'Der Nachunternehmer haftet für Schäden und Mängel aus seinen Leistungen und stellt den Auftraggeber von Ansprüchen Dritter frei. Die Gewährleistungsfrist für projektbezogene Leistungen beträgt fünf (5) Jahre ab Abnahme, sofern im jeweiligen Projektvertrag nicht abweichend geregelt.',
  },
  {
    nr: '§5',
    title: 'Vertraulichkeit und Kundenschutz',
    body:
      'Direkte Geschäftsbeziehungen zu durch den Auftraggeber vermittelten Auftraggebern oder Projektpartnern sind während der Vertragslaufzeit und für 24 Monate nach Beendigung des jeweiligen Projekts untersagt.',
  },
  {
    nr: '§6',
    title: 'Laufzeit und Kündigung',
    body:
      'Dieser Rahmenvertrag gilt auf unbestimmte Zeit und kann von beiden Parteien mit einer Frist von vier (4) Wochen zum Monatsende ordentlich gekündigt werden. Laufende Projektverträge bleiben von einer Kündigung dieses Rahmenvertrags unberührt.',
  },
  {
    nr: '§7',
    title: 'Subunternehmer und Weitervergabe',
    body:
      'Eine Weitervergabe von Leistungen an Subunternehmer bedarf der vorherigen schriftlichen Zustimmung des Auftraggebers. Der Nachunternehmer haftet für Subunternehmer wie für eigene Leistungen und stellt sicher, dass diese dieselben vertraglichen Pflichten einhalten.',
  },
  {
    nr: '§8',
    title: 'Mindestlohn, Tarifverträge und Schwarzarbeit',
    body:
      'Der Nachunternehmer verpflichtet sich zur Einhaltung des gesetzlichen Mindestlohns, anwendbarer tariflicher Verpflichtungen sowie der Mitteilungspflichten nach § 16 MiLoG. Er stellt sicher, dass keine Schwarzarbeit erfolgt und legt auf Anforderung Nachweise über die Entlohnung seiner Mitarbeiter vor.',
  },
  {
    nr: '§9',
    title: 'Versicherung',
    body:
      'Der Nachunternehmer unterhält während der gesamten Vertragslaufzeit eine Betriebshaftpflichtversicherung mit einer Mindestdeckung von 3.000.000 € je Schadensfall (Personenschäden mindestens 5.000.000 €) und weist diese auf Anforderung nach.',
  },
  {
    nr: '§10',
    title: 'Partner-Portal und elektronische Kommunikation',
    body:
      'Der Nachunternehmer nutzt das Partner-Portal des Auftraggebers zur Pflege von Stammdaten, Nachweisen und projektbezogenen Unterlagen. Uploads, Bestätigungen und Mitteilungen über das Portal oder in Textform (E-Mail) gelten als verbindlich. Der Nachunternehmer hält seine Angaben und Nachweise aktuell.',
  },
  {
    nr: '§11',
    title: 'Datenschutz',
    body:
      'Die Verarbeitung personenbezogener Daten richtet sich nach Anlage 1 (Verarbeitung von Endkundendaten durch den Nachunternehmer) und Anlage 2 (Verarbeitung von Partner- und Mitarbeiterdaten durch den Auftraggeber). Bei Widersprüchen gehen die Regelungen der Anlagen im datenschutzrechtlichen Bereich vor. Anlage 1 und Anlage 2 sind Bestandteil dieses Vertrags.',
  },
  {
    nr: '§12',
    title: 'Schriftform',
    body:
      'Änderungen und Ergänzungen dieses Vertrags sowie Kündigungen und Weisungen im Sinne der Anlagen bedürfen der Textform (schriftliche Erklärung, E-Mail oder dokumentierte Mitteilung im Partner-Portal).',
  },
  {
    nr: '§13',
    title: 'Salvatorische Klausel',
    body:
      'Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Regelung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.',
  },
  {
    nr: '§14',
    title: 'Gerichtsstand',
    body:
      'Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist München, soweit gesetzlich zulässig. Es gilt das Recht der Bundesrepublik Deutschland.',
  },
]

export function leistungSchwerpunktAusGewerk(gewerkName?: string | null): string {
  const g = gewerkName?.trim().toLowerCase() ?? ''
  if (g.includes('wdvs') || g.includes('fassade')) return 'WDVS-Arbeiten'
  if (g.includes('maler')) return 'Malerarbeiten'
  if (g.includes('fliesen')) return 'Fliesenarbeiten'
  if (g.includes('trocken')) return 'Trockenbauarbeiten'
  if (gewerkName?.trim()) return `${gewerkName.trim()}-Arbeiten`
  return 'Leistungen'
}

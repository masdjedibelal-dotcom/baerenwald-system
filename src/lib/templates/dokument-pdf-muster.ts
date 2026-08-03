/**
 * Musterdaten (Max Mustermann) für PDF-Dokumentvorlagen in Einstellungen · Formulare.
 */

import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { buildAbnahmeProtokollHtml } from '@/lib/templates/abnahme-protokoll-template'
import { emptyAbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import { buildAbschlussdokumentationHtml } from '@/lib/templates/abschlussdokumentation-template'
import {
  buildAngebotHtml,
  type AngebotHtmlInput,
  type AngebotTemplatePosition,
} from '@/lib/templates/angebot-template'
import { buildAushangHtml } from '@/lib/templates/aushang-template'
import { buildBerichtDatenquelle } from '@/lib/auftraege/bericht-datenquelle'
import { buildRegieberichtLebenszyklusHtml } from '@/lib/templates/regiebericht-lebenszyklus-template'
import { buildBautagebuchLebenszyklusHtml } from '@/lib/templates/bautagebuch-lebenszyklus-template'

export type DokumentPdfMusterId =
  | 'angebot'
  | 'rechnung'
  | 'rechnung_13b'
  | 'abnahme'
  | 'abschlussdokumentation'
  | 'aushang'
  | 'regiebericht'
  | 'bautagebuch'

export type DokumentPdfMusterEintrag = {
  id: DokumentPdfMusterId
  title: string
  description: string
  icon: string
  /** Kategorie-Label in der Liste */
  art: string
  html: string
}

function firmAdresse(f: FirmenEinstellungen): string {
  return `${f.strasse?.trim() || 'Bärenwaldstraße 20'}, ${f.plz?.trim() || '81737'} ${f.ort?.trim() || 'München'}`
}

function firmKontakt(f: FirmenEinstellungen): string {
  const parts = [f.telefon?.trim(), f.email?.trim(), f.website?.trim()].filter(Boolean)
  return parts.join(' · ') || '089 8095 5726 · info@baerenwald-muenchen.de'
}

function firmSteuer(f: FirmenEinstellungen): string | null {
  const parts = [
    f.ust_id?.trim() ? `USt-IdNr. ${f.ust_id.trim()}` : '',
    f.steuernummer?.trim() ? `Steuernr. ${f.steuernummer.trim()}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

const MUSTER_POSITIONEN: AngebotTemplatePosition[] = [
  {
    pos: 1,
    gewerk_name: 'Malerarbeiten',
    bezeichnung: 'Wände streichen (Wohnräume)',
    beschreibung: 'Zweimaliger Anstrich, Dispersionsfarbe, inkl. Abkleben und Abdecken.',
    menge: 85,
    einheit: 'm²',
    einzelpreis_netto: 18.5,
    gesamt_netto: 1572.5,
  },
  {
    pos: 2,
    gewerk_name: 'Malerarbeiten',
    bezeichnung: 'Decken weiß streichen',
    beschreibung: 'Vorbereitung und zweimaliger Anstrich.',
    menge: 42,
    einheit: 'm²',
    einzelpreis_netto: 16,
    gesamt_netto: 672,
  },
  {
    pos: 3,
    gewerk_name: 'Allgemein',
    bezeichnung: 'Anfahrtskosten (Pauschale)',
    menge: 1,
    einheit: 'pauschal',
    einzelpreis_netto: 49,
    gesamt_netto: 49,
  },
]

function summenAusPositionen(positionen: AngebotTemplatePosition[]) {
  const netto = positionen.reduce((s, p) => s + p.gesamt_netto, 0)
  const mwst_prozent = 19
  const mwst_betrag = Math.round(netto * (mwst_prozent / 100) * 100) / 100
  const brutto = Math.round((netto + mwst_betrag) * 100) / 100
  return { netto, mwst_prozent, mwst_betrag, brutto }
}

function baseFirmFields(firm: FirmenEinstellungen): Pick<
  AngebotHtmlInput,
  | 'firmenname'
  | 'firmen_rechtsform'
  | 'geschaeftsfuehrer'
  | 'firmen_adresse'
  | 'firmen_kontakt'
  | 'firmen_steuer_footer'
  | 'firmen_bankverbindung'
  | 'firmen_impressum'
  | 'firmen_logo_url'
> {
  const bank = [firm.iban?.trim(), firm.bic?.trim(), firm.bank_name?.trim()]
    .filter(Boolean)
    .join(' · ')
  return {
    firmenname: firm.firmenname?.trim() || 'Bärenwald München',
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    geschaeftsfuehrer: firm.geschaeftsfuehrer?.trim() || null,
    firmen_adresse: firmAdresse(firm),
    firmen_kontakt: firmKontakt(firm),
    firmen_steuer_footer: firmSteuer(firm) || null,
    firmen_bankverbindung: bank || null,
    firmen_impressum: firm.pdf_fusszeile?.trim() || null,
    firmen_logo_url: firm.logo_url?.trim() || null,
  }
}

function musterAngebotInput(
  firm: FirmenEinstellungen,
  art: 'angebot' | 'rechnung'
): AngebotHtmlInput {
  const positionen = MUSTER_POSITIONEN
  const summen = summenAusPositionen(positionen)
  const lohn = Math.round(summen.netto * 0.75 * 100) / 100
  const material = Math.round((summen.netto - lohn) * 100) / 100

  return {
    ...baseFirmFields(firm),
    dokument_art: art,
    mail_anrede: 'sie',
    angebotsnr: art === 'rechnung' ? 'RE-2026-0042' : 'AG-2026-0118',
    kundennr: 'K-10042',
    datum: '15.07.2026',
    gueltig_bis: art === 'rechnung' ? '' : '14.08.2026',
    kunde_name: 'Max Mustermann',
    kunde_adresse: 'Musterstraße 12\n80331 München',
    kunde_typ: 'privat',
    kunde_ort: 'München',
    durchfuehrung_in: 'Musterstraße 12, 80331 München',
    leistungsumfang: 'Malerarbeiten Wohnräume',
    begruessung: 'Sehr geehrter Herr Mustermann,',
    einleitung:
      art === 'rechnung'
        ? 'anbei erhalten Sie die Rechnung zu den erbrachten Leistungen für Ihr Projekt.'
        : 'vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot für die geplanten Malerarbeiten.',
    zahlungsbedingungen:
      art === 'rechnung'
        ? 'Zahlbar innerhalb von 14 Tagen ohne Abzug.'
        : '50 % Anzahlung bei Auftragserteilung, Rest nach Abnahme.',
    hinweise:
      'Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer. Ausführung nach Absprache.',
    positionen,
    summen,
    kostenaufstellung: { lohn_netto: lohn, material_netto: material },
    rechtshinweise: { hinweis_35a: true, hinweis_19: true, hinweis_13b: false },
    schlusstext:
      art === 'rechnung'
        ? 'Vielen Dank für Ihr Vertrauen. Bei Fragen stehen wir Ihnen gerne zur Verfügung.'
        : 'Wir freuen uns auf die Zusammenarbeit und stehen für Rückfragen jederzeit zur Verfügung.',
    dokument_typ: 'einfach',
    leistungszeitraum_text: art === 'rechnung' ? '01.07.2026 – 12.07.2026' : null,
    leistungsdatum_text: art === 'rechnung' ? null : null,
    projekt_titel: art === 'rechnung' ? 'Malerarbeiten Wohnräume' : null,
    rechnung_typ: art === 'rechnung' ? 'voll' : null,
  }
}

function musterAbnahmeHtml(firm: FirmenEinstellungen): string {
  return buildAbnahmeProtokollHtml({
    ...baseFirmFields(firm),
    firmenname: firm.firmenname?.trim() || 'Bärenwald München',
    firmen_adresse: firmAdresse(firm),
    firmen_kontakt: firmKontakt(firm),
    auftragsNr: 'AU-2026-0087',
    projektTitel: 'Malerarbeiten Wohnräume',
    abnahmeDatum: '12.07.2026',
    kunde_name: 'Max Mustermann',
    kunde_adresse: 'Musterstraße 12\n80331 München',
    gewerke: [
      {
        gewerk: 'Malerarbeiten',
        leistungen: [
          {
            leistung_id: 'l1',
            leistung_name: 'Wände streichen (Wohnräume)',
            punkte: [
              {
                id: 'p1',
                gewerk: 'Malerarbeiten',
                leistung_id: 'l1',
                leistung_name: 'Wände streichen (Wohnräume)',
                beschreibung: 'Oberfläche gleichmäßig, ohne Fehlstellen',
                status: 'ok',
              },
              {
                id: 'p2',
                gewerk: 'Malerarbeiten',
                leistung_id: 'l1',
                leistung_name: 'Wände streichen (Wohnräume)',
                beschreibung: 'Schutz von Böden und Möbeln entfernt',
                status: 'ok',
              },
            ],
          },
          {
            leistung_id: 'l2',
            leistung_name: 'Decken weiß streichen',
            punkte: [
              {
                id: 'p3',
                gewerk: 'Malerarbeiten',
                leistung_id: 'l2',
                leistung_name: 'Decken weiß streichen',
                beschreibung: 'Deckenfläche vollständig gestrichen',
                status: 'ok',
                notizen: ['Leichte Nacharbeit an der Decke Wohnzimmer vereinbart.'],
              },
            ],
          },
        ],
      },
    ],
    maengel: [
      {
        punkt_id: 'p3',
        beschreibung: 'Kleine Fehlstelle an der Decke Wohnzimmer nacharbeiten',
        frist: '19.07.2026',
        status: 'offen',
      },
    ],
    notizen: 'Abnahme unter Vorbehalt der genannten Nacharbeit.',
    meta: emptyAbnahmeProtokollMeta({
      uebergabe_uhrzeit: '11:00',
      uebergabe_ort: '80331 München',
      vertreter_an: 'Max Mustermann (Bärenwald)',
      ansprechpartner_kunde: 'Max Mustermann',
      anwesend_uebergabe: 'Erika Mustermann',
      projektbezeichnung: 'Malerarbeiten Wohnräume',
      projektadresse: 'Musterstraße 12, 80331 München',
      leistungsumfang_kurz: 'Streichen der Wohnräume inkl. Decken.',
      abnahme_ergebnis: 'mit_vorbehalt',
      hinweis_sonstiges: 'Nacharbeit Decke Wohnzimmer bis 19.07.2026.',
    }),
  })
}

function musterAbschlussHtml(firm: FirmenEinstellungen): string {
  const summen = summenAusPositionen(MUSTER_POSITIONEN)
  return buildAbschlussdokumentationHtml({
    ...baseFirmFields(firm),
    firmenname: firm.firmenname?.trim() || 'Bärenwald München',
    firmen_adresse: firmAdresse(firm),
    firmen_kontakt: firmKontakt(firm),
    mail_anrede: 'sie',
    begruessung: 'Sehr geehrter Herr Mustermann,',
    dokumentTitel: 'Malerarbeiten Wohnräume',
    erstelltAm: '12.07.2026',
    leistungszeitraum_text: '01.07.2026 – 12.07.2026',
    summen,
    kunde_name: 'Max Mustermann',
    kunde_adresse: 'Musterstraße 12\n80331 München',
    durchfuehrung_in: 'Musterstraße 12, 80331 München',
    positionen: MUSTER_POSITIONEN.map((p) => ({
      gewerk: p.gewerk_name || 'Allgemein',
      leistung: p.bezeichnung,
      beschreibung: p.beschreibung,
      menge: p.menge,
      einheit: p.einheit,
      preis_netto: p.gesamt_netto,
    })),
    abnahmePunkte: [
      {
        id: 'p1',
        gewerk: 'Malerarbeiten',
        leistung_name: 'Wände streichen',
        beschreibung: 'Ausführung geprüft und abgenommen',
        status: 'ok',
      },
      {
        id: 'p2',
        gewerk: 'Malerarbeiten',
        leistung_name: 'Decken streichen',
        beschreibung: 'Ausführung geprüft und abgenommen',
        status: 'ok',
      },
    ],
    bautagebuch: [
      {
        datumSort: '2026-07-02',
        datumLabel: '02.07.2026',
        titel: 'Vorbereitung & Abkleben',
        beschreibung: 'Räume freigeräumt, Böden und Möbel abgedeckt.',
      },
      {
        datumSort: '2026-07-08',
        datumLabel: '08.07.2026',
        titel: 'Anstrich Wohnräume',
        beschreibung: 'Erster und zweiter Anstrich der Wände.',
      },
    ],
    fotoUrls: [],
    mitBautagebuch: true,
    mitFotos: false,
    mitPreisen: false,
  })
}

/** Alle Kunden-PDFs mit Mustermann-Beispielinhalt. */
export function buildDokumentPdfMusterListe(
  firm: FirmenEinstellungen = defaultFirmenEinstellungen()
): DokumentPdfMusterEintrag[] {
  const rechnung13bInput = musterAngebotInput(firm, 'rechnung')
  rechnung13bInput.kunde_typ = 'hausverwaltung'
  rechnung13bInput.rechtshinweise = {
    hinweis_35a: false,
    hinweis_19: false,
    hinweis_13b: true,
  }
  rechnung13bInput.summen = {
    ...rechnung13bInput.summen,
    mwst_prozent: 0,
    mwst_betrag: 0,
    brutto: rechnung13bInput.summen.netto,
  }

  const berichtMuster = buildBerichtDatenquelle({
    auftragId: 'au-muster-001',
    projektTitel: 'Malerarbeiten Wohnräume',
    projektAdresse: 'Musterstraße 12, 80331 München',
    auftraggeberName: 'Max Mustermann',
    positionen: [
      {
        id: 'pos-1',
        leistung_name: 'Wände streichen',
        gewerk_name: 'Malerarbeiten',
        typ: 'regie',
        verguetung: 'aufwand',
        stundensatz: 69,
        geschaetzt_std: 4,
        handwerker_name: 'Hans Handwerk',
      },
      {
        id: 'pos-2',
        leistung_name: 'Decken streichen',
        gewerk_name: 'Malerarbeiten',
        typ: 'lv',
        verguetung: 'festpreis',
      },
    ],
    material: [
      {
        position_id: 'pos-1',
        bezeichnung: 'Dispersionsfarbe weiß',
        menge: 2,
        einzelpreis: 28.5,
        gesamt: 57,
      },
    ],
    schichten: [
      {
        auftrag_id: 'au-muster-001',
        tag: '2026-07-08',
        spanne_von: '2026-07-08T08:00:00',
        spanne_bis: '2026-07-08T12:05:00',
        foto_count: 2,
      },
    ],
    eintraege: [
      {
        id: 'e1',
        position_id: 'pos-1',
        typ: 'fortschritt',
        beschreibung: 'Erster Anstrich Wohnzimmer und Flur',
        zeit_minuten: 125,
        erfasst_von: 'crm_intern',
        ereignis_zeit: '2026-07-08T10:00:00',
        created_at: '2026-07-08T10:00:00',
        eintrag_fotos: [],
      },
      {
        id: 'e2',
        position_id: 'pos-2',
        typ: 'fortschritt',
        beschreibung: 'Decken vorbereitet und gestrichen',
        zeit_minuten: 60,
        erfasst_von: 'partner_app',
        ereignis_zeit: '2026-07-08T11:30:00',
        created_at: '2026-07-08T11:30:00',
        eintrag_fotos: [],
      },
    ],
  })

  return [
    {
      id: 'angebot',
      title: 'Angebot',
      art: 'Kunde · PDF',
      description: 'Angebot mit Positionen, Summen und Mustermann-Texten',
      icon: 'file-invoice',
      html: buildAngebotHtml(musterAngebotInput(firm, 'angebot'), { includeBodyFooter: true }),
    },
    {
      id: 'rechnung',
      title: 'Rechnung',
      art: 'Kunde · PDF',
      description: 'Rechnung mit §35a-Hinweis (Privat, Lohn ausgewiesen)',
      icon: 'receipt',
      html: buildAngebotHtml(musterAngebotInput(firm, 'rechnung'), { includeBodyFooter: true }),
    },
    {
      id: 'rechnung_13b',
      title: 'Rechnung §13b',
      art: 'Kunde · PDF',
      description: 'Rechnung mit Reverse-Charge-Hinweis (§13b), wenn gesetzt',
      icon: 'receipt',
      html: buildAngebotHtml(rechnung13bInput, { includeBodyFooter: true }),
    },
    {
      id: 'aushang',
      title: 'Aushang Schadenmeldung',
      art: 'HV · PDF',
      description: 'Einseitiger Mieter-Aushang mit QR und HV-Branding',
      icon: 'qrcode',
      html: buildAushangHtml({
        orgName: 'Verwaltung Mustermann',
        orgSub: 'Verwaltung',
        primaryColor: '#22508C',
        objektTitel: 'WEG Musterstraße 12',
        objektAdresse: 'Musterstraße 12 · 80331 München',
        meldeUrl: 'https://baerenwaldmuenchen.de/melden/musterverwaltung/musterstrasse-12',
        qrDataUrl: null,
        hvTelefon: '089 123456',
        hvEmail: 'hv@example.de',
      }),
    },
    {
      id: 'regiebericht',
      title: 'Regiebericht',
      art: 'Auftrag · PDF',
      description: 'Zeiterfassung · Tätigkeiten · Material · Soll/Ist · §35a',
      icon: 'clock',
      html: buildRegieberichtLebenszyklusHtml({
        ...baseFirmFields(firm),
        firmenname: firm.firmenname?.trim() || 'Bärenwald München',
        firmen_adresse: firmAdresse(firm),
        firmen_kontakt: firmKontakt(firm),
        data: berichtMuster,
        stundensatz: 69,
        lohnNetto: 143.75,
        materialNetto: 57,
        mwst: 38.14,
        brutto: 238.89,
        handwerkerName: 'Hans Handwerk',
        gewerkName: 'Malerarbeiten',
        sollIst: 'geschätzt 4:00 / erfasst 2:05',
        hinweis35a: true,
      }),
    },
    {
      id: 'bautagebuch',
      title: 'Bautagebuch',
      art: 'Auftrag · PDF',
      description: 'Zweistufig Tag → Position aus gemeinsamer Quelle',
      icon: 'book',
      html: buildBautagebuchLebenszyklusHtml({
        ...baseFirmFields(firm),
        firmenname: firm.firmenname?.trim() || 'Bärenwald München',
        firmen_adresse: firmAdresse(firm),
        firmen_kontakt: firmKontakt(firm),
        data: berichtMuster,
      }),
    },
    {
      id: 'abnahme',
      title: 'Abnahmeprotokoll',
      art: 'Kunde · PDF',
      description: 'Abnahme mit Checkliste, Mängeln und Unterschrift',
      icon: 'clipboard-list',
      html: musterAbnahmeHtml(firm),
    },
    {
      id: 'abschlussdokumentation',
      title: 'Abschlussdokumentation',
      art: 'Kunde · PDF',
      description: 'Projektabschluss mit Leistungen, Abnahme und Bautagebuch',
      icon: 'file-text',
      html: musterAbschlussHtml(firm),
    },
  ]
}

/**
 * Referenzdaten aus Baerenwald_GU_Nachunternehmervertrag_FINAL.pdf (WDVS / Rausch ProjektBAU).
 * Für Vorschau-PDFs und Partner-Anlage.
 */
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { VertragHandwerkerSnapshot, VertragPdfPayload } from '@/lib/vertraege/types'

/** Unterschriftsdatum Ursprungsvertrag (aus Baerenwald_GU_Nachunternehmervertrag_FINAL.pdf) */
export const WDVS_URSPRUNGSVERTRAG_DATUM = '08.06.2026'

export const RAUSCH_PROJEKTBAU: VertragHandwerkerSnapshot = {
  id: '00000000-0000-4000-8000-00000000ra01',
  name: 'Rausch ProjektBAU – Innen & Außenbau',
  firma: null,
  adresse: 'Baumgartnerstraße 9, 81373 München',
  telefon: '015151384775',
  email: null,
  steuernummer: '159/247/70845',
  ustid: null,
}

export function firmenDatenAusReferenzPdf(): FirmenEinstellungen {
  const base = defaultFirmenEinstellungen()
  return {
    ...base,
    firmenname: 'Bärenwald München',
    strasse: 'Bärenwaldstraße 20',
    plz: '81737',
    ort: 'München',
    website: 'www.baerenwaldmuenchen.de',
    ust_id: 'DE362198001',
    steuernummer: '144/177/21070',
    pdf_fusszeile: '',
  }
}

const urpsrungsBezug = WDVS_URSPRUNGSVERTRAG_DATUM.trim()
  ? `Nachunternehmervertrag vom ${WDVS_URSPRUNGSVERTRAG_DATUM.trim()}`
  : 'dem ursprünglichen Nachunternehmervertrag'

export const WDVS_PROJEKT_VERTRAG: Omit<VertragPdfPayload, 'firm' | 'handwerker'> = {
  typ: 'projekt',
  vertrags_nr: '',
  vertrag_vom: WDVS_URSPRUNGSVERTRAG_DATUM,
  bauvorhaben: 'WDVS Fassadenarbeiten – Krumptnerstr. 17, München',
  gewerk_name: 'WDVS / Fassade',
  leistungsumfang:
    'Tiefgrund, Ausgleichsputz, WDVS EPS 180 mm, WDVS Aufzugsschächte 120 mm, Armierung, Oberputz, Brandriegel, Sockelbereiche, Fenster- und Türlaibungen, Tropfkanten, Lüftungsöffnungen, Gerüstankerverschlüsse und sämtliche Nebenleistungen.',
  verguetung_text:
    'Die Vergütung beträgt 39,00 € netto je m² für 3.000 m² Fassadenfläche. Regiearbeiten werden ausschließlich nach vorheriger schriftlicher Freigabe vergütet. Regiesatz 56,00 € netto pro Stunde.',
  regiesatz_netto: 56,
  einbehalt_prozent: 5,
  zahlungsziel_tage: 14,
  aufmass_rhythmus_tage: 14,
}

export function wdvsProjektVertragPayload(): VertragPdfPayload {
  return {
    ...WDVS_PROJEKT_VERTRAG,
    firm: firmenDatenAusReferenzPdf(),
    handwerker: RAUSCH_PROJEKTBAU,
  }
}

/** Ergänzung: +3.000 m² à 44 € — Bezug auf Ursprungsvertrag per Datum */
export const WDVS_NACHTRAG_VERTRAG: Omit<VertragPdfPayload, 'firm' | 'handwerker'> = {
  typ: 'projekt',
  vertrags_nr: '',
  dokument_titel: 'Ergänzungsvereinbarung zum Nachunternehmervertrag',
  bezug_vertrag_vom: WDVS_URSPRUNGSVERTRAG_DATUM,
  bauvorhaben: 'WDVS Fassadenarbeiten – Krumptnerstr. 17, München (gleiches Bauvorhaben)',
  gewerk_name: 'WDVS / Fassade',
  leistungsumfang:
    'Ergänzung des beauftragten Leistungsumfangs um weitere 3.000 m² Fassadenfläche am o. g. Bauvorhaben. ' +
    `Leistungsbild und Ausführung entsprechen ${urpsrungsBezug} ` +
    '(Tiefgrund, Ausgleichsputz, WDVS EPS, Armierung, Oberputz, Brandriegel, Sockel, Laibungen, Nebenleistungen).',
  verguetung_text:
    (WDVS_URSPRUNGSVERTRAG_DATUM.trim()
      ? `Bezug: Nachunternehmervertrag vom ${WDVS_URSPRUNGSVERTRAG_DATUM.trim()}.\n\n`
      : 'Bezug: dem zwischen den Parteien geschlossenen Nachunternehmervertrag.\n\n') +
    'Für die ursprünglich vereinbarten 3.000 m² gilt unverändert eine Vergütung von 39,00 € netto je m².\n\n' +
    'Für die mit dieser Ergänzungsvereinbarung beauftragten weiteren 3.000 m² beträgt die Vergütung 44,00 € netto je m².\n\n' +
    'Die übrigen Konditionen des ursprünglichen Nachunternehmervertrags (u. a. Regiesatz, Aufmaß, Zahlungsziel, Sicherheitseinbehalt) gelten unverändert.',
  regiesatz_netto: 56,
  einbehalt_prozent: 5,
  zahlungsziel_tage: 14,
  aufmass_rhythmus_tage: 14,
}

export function wdvsNachtragVertragPayload(): VertragPdfPayload {
  return {
    ...WDVS_NACHTRAG_VERTRAG,
    firm: firmenDatenAusReferenzPdf(),
    handwerker: RAUSCH_PROJEKTBAU,
  }
}

export function rauschRahmenVertragPayload(vertrags_nr = 'RV-2026-001'): VertragPdfPayload {
  return {
    typ: 'rahmen',
    vertrags_nr,
    leistungsumfang: '',
    einbehalt_prozent: 5,
    zahlungsziel_tage: 14,
    aufmass_rhythmus_tage: 14,
    firm: firmenDatenAusReferenzPdf(),
    handwerker: RAUSCH_PROJEKTBAU,
  }
}

/** SQL zum Anlegen des Partners in Supabase (einmalig ausführen). */
export const RAUSCH_PARTNER_INSERT_SQL = `
insert into public.handwerker (
  name, firma, email, telefon, adresse, steuernummer, gewerke, aktiv, notizen
)
select
  'Rausch ProjektBAU – Innen & Außenbau',
  null,
  null,
  '015151384775',
  'Baumgartnerstraße 9, 81373 München',
  '159/247/70845',
  array['wdvs', 'fassade']::text[],
  true,
  'Nachunternehmer WDVS Krumptnerstr. 17'
where not exists (
  select 1 from public.handwerker
  where name = 'Rausch ProjektBAU – Innen & Außenbau'
    and telefon = '015151384775'
);
`.trim()
